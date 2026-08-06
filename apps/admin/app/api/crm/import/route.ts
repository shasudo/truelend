import { headers } from "next/headers";
import { and, inArray, notInArray } from "drizzle-orm";
import { z } from "zod";
import { schema, type NewCallTask } from "@truelend/db";
import {
  callTaskCsvColumns,
  callTaskCsvRequiredColumns,
  normalizeIndianMobile,
  resolveProductSlug,
  terminalCallStatusValues,
  validationPatterns,
} from "@truelend/reference";
import { createAuthContext } from "@/lib/auth";
import { parseCsv, mapHeader } from "@/lib/csv";
import { errorType } from "@/lib/error-type";
import { scheduleAdminRequestContextCleanup } from "@/lib/request-context-cleanup";

const MAX_BYTES = 4 * 1024 * 1024;
const MAX_ROWS = 20000;
// Excel and Windows both hand `.csv` a spreadsheet MIME; Safari sends text/plain.
const allowedContentTypes = ["text/csv", "application/vnd.ms-excel", "text/plain", ""];

/**
 * One failed row, reported by position and reason only — never by value.
 *
 * A duplicate is deliberately NOT one of these: re-exported call lists overlap
 * as a matter of course, and rejecting a whole file because 12 of 16000 rows
 * were already in the queue makes the import unusable. Duplicates are skipped
 * and counted instead. A malformed row still fails the file, because that is a
 * data problem someone has to go and fix.
 */
interface RowFailure {
  row: number;
  code: "name_missing" | "phone_invalid" | "too_many_columns";
}
const MAX_REPORTED_FAILURES = 50;
/** Phones per duplicate-lookup statement, keeping bind parameters well inside Postgres' 65535. */
const LOOKUP_CHUNK = 1000;

// Same bound convertSchema applies to a call task's email at conversion time —
// reused here so an import can't seed a value conversion would have rejected.
const emailPattern = z.string().trim().max(254).email();

/** Cap a free-text cell the way the equivalent field is capped everywhere else in the app. */
function capped(value: string, max: number): string | null {
  return value ? value.slice(0, max) : null;
}

/*
 * Bulk prospect import. A CSV has no magic bytes to sniff, so the equivalent
 * guarantee comes from the payload itself: no NUL in the head (a renamed ZIP,
 * XLSX, PDF or image fails here), a strict UTF-8 decode, and a header row that
 * must resolve the required columns. That validates the whole file's
 * decodability and its schema, which a four-byte signature never could.
 *
 * The rows are prospect PII, so failures are reported as record numbers and
 * codes; no cell value is ever logged or returned.
 */
export async function POST(req: Request) {
  const { auth, db, ctx, env } = createAuthContext();
  let databaseOutcomeUnknown = false;
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (session?.user.role !== "admin") {
      return Response.json({ error: "Not authorized." }, { status: 403 });
    }
    const origin = req.headers.get("origin");
    const fetchSite = req.headers.get("sec-fetch-site");
    if (
      origin !== new URL(env.BETTER_AUTH_URL).origin ||
      (fetchSite && fetchSite !== "same-origin")
    ) {
      return Response.json({ error: "Invalid upload origin." }, { status: 403 });
    }
    // Reject an obviously oversized multipart request before materializing it.
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_BYTES + 100_000) {
      return Response.json({ error: "File must be 512KB or smaller." }, { status: 413 });
    }
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return Response.json({ error: "Invalid upload request." }, { status: 400 });
    }
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return Response.json({ error: "No file provided." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return Response.json({ error: "File must be 512KB or smaller." }, { status: 413 });
    }
    if (!allowedContentTypes.includes(file.type) || !file.name.toLowerCase().endsWith(".csv")) {
      return Response.json({ error: "Upload a .csv file." }, { status: 400 });
    }
    if (!(await env.AUTH_RATE_LIMITER.limit({ key: `crm-import:${session.user.id}` })).success) {
      return Response.json({ error: "Too many imports. Please wait a minute." }, { status: 429 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    // Excel's "Save As -> Unicode Text" (sitting right next to "CSV UTF-8" in
    // the same dropdown) produces UTF-16, which the generic NUL sniff below
    // would also catch — but as the wrong, unhelpful "not a CSV" message. Name
    // the actual problem for the one encoding mistake an Excel user is most
    // likely to make.
    const hasUtf16Bom =
      (bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff);
    if (hasUtf16Bom) {
      return Response.json(
        { error: "That file is UTF-16. Re-save it as CSV UTF-8 and try again." },
        { status: 400 },
      );
    }
    if (bytes.subarray(0, 512).includes(0x00)) {
      return Response.json({ error: "That file is not a CSV." }, { status: 400 });
    }
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      return Response.json({ error: "Save the file as UTF-8 CSV and try again." }, { status: 400 });
    }

    let records: string[][];
    try {
      records = parseCsv(text);
    } catch {
      return Response.json(
        { error: "A quoted field is never closed. Fix the quotes and try again." },
        { status: 400 },
      );
    }
    const [header, ...dataRows] = records;
    if (!header) return Response.json({ error: "That file is empty." }, { status: 400 });
    const columns = mapHeader(header, callTaskCsvColumns);
    const missing = callTaskCsvRequiredColumns.filter((name) => columns[name] === undefined);
    if (missing.length > 0) {
      return Response.json(
        { error: `The header row needs a column for: ${missing.join(", ")}.` },
        { status: 400 },
      );
    }
    if (dataRows.length === 0) {
      return Response.json({ error: "That file has no rows." }, { status: 400 });
    }
    if (dataRows.length > MAX_ROWS) {
      return Response.json(
        { error: `Import up to ${MAX_ROWS} rows at a time. Split the file and try again.` },
        { status: 413 },
      );
    }

    const cell = (row: string[], column: keyof typeof columns) => {
      const index = columns[column];
      return index === undefined ? "" : (row[index] ?? "").trim();
    };

    const failures: RowFailure[] = [];
    // Kept separate from `values` until the post-loop duplicate check below
    // decides whether they actually survive — see the comment there for why.
    const candidates: { recordNumber: number; phone: string; value: NewCallTask }[] = [];
    const seenPhones = new Set<string>();
    /** Rows dropped as duplicates. Reported, never fatal. */
    let skipped = 0;
    dataRows.forEach((row, index) => {
      // +2: one for the header, one because operators count from 1. This is the
      // record number, which only differs from the file line when a quoted field
      // contains a newline — hence "record" in the operator-facing copy.
      const recordNumber = index + 2;
      // Spreadsheets export trailing ",,," and whitespace-only lines; those are
      // padding, not rows a caller is expected to fix.
      if (row.every((value) => value.trim() === "")) return;
      if (row.length > header.length) {
        failures.push({ row: recordNumber, code: "too_many_columns" });
        return;
      }
      const name = cell(row, "name");
      const phone = normalizeIndianMobile(cell(row, "phone"));
      if (!name) {
        failures.push({ row: recordNumber, code: "name_missing" });
        return;
      }
      if (!validationPatterns.indianMobile.test(phone)) {
        failures.push({ row: recordNumber, code: "phone_invalid" });
        return;
      }
      // A repeated phone within the same file — a re-exported list, a copy-paste
      // slip — would otherwise seed two call tasks for one person. The first
      // occurrence wins and the later one is dropped, so which row survives does
      // not depend on anything but file order.
      if (seenPhones.has(phone)) {
        skipped += 1;
        return;
      }
      seenPhones.add(phone);

      const emailRaw = cell(row, "email");
      const email = emailRaw && emailPattern.safeParse(emailRaw).success ? emailRaw : null;

      candidates.push({
        recordNumber,
        phone,
        value: {
          name: name.slice(0, 120),
          phone,
          email,
          city: capped(cell(row, "city"), 80),
          productSlug: resolveProductSlug(cell(row, "product")),
          source: capped(cell(row, "source"), 120),
          notes: capped(cell(row, "notes"), 4000),
        },
      });
    });

    /*
     * All or nothing, for malformed rows only: importing 1999 of 2000 rows
     * silently drops row 1443 out of a call list, and nothing downstream would
     * ever surface it. Checked before the duplicate lookup so a broken file
     * costs no database work.
     */
    if (failures.length > 0) {
      return Response.json(
        {
          error: "Some rows need fixing. Nothing was imported.",
          total: dataRows.length,
          invalid: failures.length,
          failures: failures.slice(0, MAX_REPORTED_FAILURES),
        },
        { status: 400 },
      );
    }

    // Every data row was blank padding, or every one was a repeat of an earlier
    // row in the same file. Distinct from "nothing new to import" below.
    if (candidates.length === 0) {
      return Response.json({ error: "That file has no rows." }, { status: 400 });
    }

    /*
     * A phone already open in the queue (imported before, or still being
     * worked) is also a duplicate — just one the file alone can't see. A
     * *closed* task for the same phone is not: re-importing a closed-out
     * prospect to reopen them is the documented way to do it, so only an
     * open task drops the row.
     *
     * Chunked because this runs over every surviving row of a file that may
     * carry 20000 of them.
     */
    const openPhones = new Set<string>();
    for (let i = 0; i < candidates.length; i += LOOKUP_CHUNK) {
      const phones = candidates.slice(i, i + LOOKUP_CHUNK).map((c) => c.phone);
      const rows = await db
        .select({ phone: schema.callTasks.phone })
        .from(schema.callTasks)
        .where(
          and(
            inArray(schema.callTasks.phone, phones),
            notInArray(schema.callTasks.status, [...terminalCallStatusValues]),
          ),
        );
      for (const row of rows) openPhones.add(row.phone);
    }

    const fresh = candidates.filter((candidate) => !openPhones.has(candidate.phone));
    skipped += candidates.length - fresh.length;

    if (fresh.length === 0) {
      // Not an error: re-uploading a list already in the queue is a no-op, and
      // saying so is more useful than a red box claiming the file was bad.
      return Response.json({ ok: true, imported: 0, skipped });
    }
    const values = fresh.map((c) => c.value);

    // ponytail: 20000 rows / 4MB / one transaction, chunked at 500 rows per
    // INSERT — 4000 bind parameters a statement, 40 statements for a full file.
    // If imports outgrow this, split the file client-side before reaching for a
    // job runner: this account has no Queue, Durable Object, KV or cron binding
    // to run one on.
    const CHUNK = 500;
    databaseOutcomeUnknown = true;
    await db.transaction(async (tx) => {
      for (let i = 0; i < values.length; i += CHUNK) {
        await tx.insert(schema.callTasks).values(values.slice(i, i + CHUNK));
      }
      await tx.insert(schema.auditLog).values({
        actorId: session.user.id,
        actorEmail: session.user.email,
        action: "call_task.import",
        entityType: "call_task",
        entityId: null,
        after: { imported: values.length, skippedDuplicates: skipped },
      });
    });
    databaseOutcomeUnknown = false;

    return Response.json({ ok: true, imported: values.length, skipped });
  } catch (error) {
    console.error(JSON.stringify({ event: "crm_import_failed", errorType: errorType(error) }));
    return Response.json(
      {
        error: databaseOutcomeUnknown
          ? "We couldn't confirm this import. Reload the call queue before trying again."
          : "Import failed. Please try again.",
        uncertain: databaseOutcomeUnknown || undefined,
      },
      { status: databaseOutcomeUnknown ? 503 : 500 },
    );
  } finally {
    scheduleAdminRequestContextCleanup({ db, ctx });
  }
}
