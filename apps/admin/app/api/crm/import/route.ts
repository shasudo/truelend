import { headers } from "next/headers";
import { schema, type NewCallTask } from "@truelend/db";
import {
  callTaskCsvColumns,
  callTaskCsvRequiredColumns,
  isProductSlug,
  normalizeIndianMobile,
  validationPatterns,
} from "@truelend/reference";
import { createAuthContext } from "@/lib/auth";
import { parseCsv, mapHeader } from "@/lib/csv";
import { errorType } from "@/lib/error-type";
import { scheduleAdminRequestContextCleanup } from "@/lib/request-context-cleanup";

const MAX_BYTES = 512 * 1024;
const MAX_ROWS = 2000;
// Excel and Windows both hand `.csv` a spreadsheet MIME; Safari sends text/plain.
const allowedContentTypes = ["text/csv", "application/vnd.ms-excel", "text/plain", ""];

/** One failed row, reported by position and reason only — never by value. */
interface RowFailure {
  row: number;
  code: "name_missing" | "phone_invalid" | "too_many_columns";
}
const MAX_REPORTED_FAILURES = 50;

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
    const values: NewCallTask[] = [];
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
      const product = cell(row, "product");
      values.push({
        name: name.slice(0, 120),
        phone,
        email: cell(row, "email") || null,
        city: cell(row, "city") || null,
        productSlug: isProductSlug(product) ? product : null,
        source: cell(row, "source") || null,
        notes: cell(row, "notes") || null,
      });
    });

    // All or nothing: importing 1999 of 2000 rows silently drops row 1443 out
    // of a call list, and nothing downstream would ever surface it.
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
    if (values.length === 0) {
      return Response.json({ error: "That file has no rows." }, { status: 400 });
    }

    // ponytail: 2000 rows / 512KB / one transaction, chunked at 100 rows per
    // INSERT. If imports outgrow this, split the file client-side before
    // reaching for a job runner — this account has no Queue, Durable Object,
    // KV or cron binding to run one on.
    const CHUNK = 100;
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
        after: { imported: values.length },
      });
    });
    databaseOutcomeUnknown = false;

    return Response.json({ ok: true, imported: values.length });
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
