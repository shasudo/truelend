import { headers } from "next/headers";
import { eq, inArray } from "drizzle-orm";
import { schema } from "@truelend/db";
import {
  bankLeadCsvColumns,
  bankLeadCsvRequiredColumns,
  hdfcApplicationCsvColumns,
  hdfcApplicationCsvRequiredColumns,
} from "@truelend/reference";
import { createAuthContext } from "@/lib/auth";
import { deriveBankLeadStatus } from "@/lib/bank-lead-status";
import { parseBankDate } from "@/lib/bank-lead-date";
import { extractTrackingCode } from "@/lib/bank-lead-tracking-code";
import { parseCsv, mapHeader } from "@/lib/csv";
import { errorType } from "@/lib/error-type";
import { scheduleAdminRequestContextCleanup } from "@/lib/request-context-cleanup";

// Chunk size for the HDFC bulk insert of new (never-seen) applications —
// mirrors the CRM import's CHUNK, same reasoning: bind-parameter limit per
// statement on a file that may carry MAX_ROWS rows.
const INSERT_CHUNK = 500;

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 20_000;
// Excel and Windows both hand `.csv` a spreadsheet MIME; Safari sends text/plain.
const allowedContentTypes = ["text/csv", "application/vnd.ms-excel", "text/plain", ""];

/*
 * Reconciles the bank's periodic status export against bank_apply_leads.
 * Unlike the call-task CSV import, this is NOT a bulk insert: the file is the
 * bank/DSA's entire book of business, so the overwhelming majority of rows
 * carry no tracking code of ours at all — that's the expected shape of the
 * file, not a validation failure. Only rows whose utm_content resolves to a
 * tracking code we generated, and that still exist, get written.
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
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_BYTES + 100_000) {
      return Response.json({ error: "File must be 5MB or smaller." }, { status: 413 });
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
      return Response.json({ error: "File must be 5MB or smaller." }, { status: 413 });
    }
    if (!allowedContentTypes.includes(file.type) || !file.name.toLowerCase().endsWith(".csv")) {
      return Response.json({ error: "Upload a .csv file." }, { status: 400 });
    }
    if (
      !(await env.AUTH_RATE_LIMITER.limit({ key: `bank-lead-import:${session.user.id}` })).success
    ) {
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
    if (dataRows.length === 0) {
      return Response.json({ error: "That file has no rows." }, { status: 400 });
    }
    if (dataRows.length > MAX_ROWS) {
      return Response.json(
        { error: `Import up to ${MAX_ROWS} rows at a time. Split the file and try again.` },
        { status: 413 },
      );
    }

    // HDFC's export has no tracking code or phone number to reconcile
    // against a bank_apply_leads row — see hdfcApplicationCsvColumns's
    // comment — so it's imported into its own report table instead.
    const bank = form.get("bank") === "hdfc" ? "hdfc" : "indusind";

    if (bank === "hdfc") {
      const columns = mapHeader(header, hdfcApplicationCsvColumns);
      const missing = hdfcApplicationCsvRequiredColumns.filter(
        (name) => columns[name] === undefined,
      );
      if (missing.length > 0) {
        const missingLabels = missing.map((name) => hdfcApplicationCsvColumns[name][0]);
        return Response.json(
          { error: `The header row needs a column for: ${missingLabels.join(", ")}.` },
          { status: 400 },
        );
      }

      const cell = (row: string[], column: keyof typeof columns) => {
        const index = columns[column];
        return index === undefined ? "" : (row[index] ?? "").trim();
      };

      // Keyed by applicationReferenceNumber: first occurrence in the file
      // wins, same convention as the CRM import's phone dedup.
      const candidates = new Map<
        string,
        {
          customerName: string | null;
          city: string | null;
          state: string | null;
          currentStage: string | null;
          finalDecision: string | null;
          creationDateTime: string | null;
          dsaCode: string | null;
          raw: Record<string, string>;
        }
      >();
      dataRows.forEach((row) => {
        if (row.every((value) => value.trim() === "")) return;
        const applicationReferenceNumber = cell(row, "applicationReferenceNumber");
        if (!applicationReferenceNumber || candidates.has(applicationReferenceNumber)) return;
        const raw: Record<string, string> = {};
        header.forEach((name, index) => {
          if (name.trim()) raw[name.trim()] = (row[index] ?? "").trim();
        });
        candidates.set(applicationReferenceNumber, {
          customerName: cell(row, "customerName") || null,
          city: cell(row, "city") || null,
          state: cell(row, "state") || null,
          currentStage: cell(row, "currentStage") || null,
          finalDecision: cell(row, "finalDecision") || null,
          creationDateTime: cell(row, "creationDateTime") || null,
          dsaCode: cell(row, "dsaCode") || null,
          raw,
        });
      });

      let matched = 0;
      let created = 0;
      if (candidates.size > 0) {
        const existing = await db
          .select({
            id: schema.hdfcApplications.id,
            applicationReferenceNumber: schema.hdfcApplications.applicationReferenceNumber,
          })
          .from(schema.hdfcApplications)
          .where(
            inArray(schema.hdfcApplications.applicationReferenceNumber, [...candidates.keys()]),
          );
        const existingRefs = new Set(existing.map((row) => row.applicationReferenceNumber));
        const newRows = [...candidates.entries()]
          .filter(([ref]) => !existingRefs.has(ref))
          .map(([applicationReferenceNumber, update]) => ({
            applicationReferenceNumber,
            ...update,
          }));

        databaseOutcomeUnknown = true;
        await db.transaction(async (tx) => {
          for (const row of existing) {
            const update = candidates.get(row.applicationReferenceNumber);
            if (!update) continue;
            await tx
              .update(schema.hdfcApplications)
              .set(update)
              .where(eq(schema.hdfcApplications.id, row.id));
            matched += 1;
          }
          for (let i = 0; i < newRows.length; i += INSERT_CHUNK) {
            await tx.insert(schema.hdfcApplications).values(newRows.slice(i, i + INSERT_CHUNK));
          }
          created = newRows.length;
          await tx.insert(schema.auditLog).values({
            actorId: session.user.id,
            actorEmail: session.user.email,
            action: "hdfc_application.import",
            entityType: "hdfc_application",
            entityId: null,
            after: { total: dataRows.length, matched, created },
          });
        });
        databaseOutcomeUnknown = false;
      }

      return Response.json({ ok: true, total: dataRows.length, matched, created });
    }

    const columns = mapHeader(header, bankLeadCsvColumns);
    const missing = bankLeadCsvRequiredColumns.filter((name) => columns[name] === undefined);
    if (missing.length > 0) {
      // Report the CSV header alias the admin actually needs to add (e.g.
      // "utm_content"), not our internal column key ("trackingCode").
      const missingLabels = missing.map((name) => bankLeadCsvColumns[name][0]);
      return Response.json(
        { error: `The header row needs a column for: ${missingLabels.join(", ")}.` },
        { status: 400 },
      );
    }

    const cell = (row: string[], column: keyof typeof columns) => {
      const index = columns[column];
      return index === undefined ? "" : (row[index] ?? "").trim();
    };

    // Only rows whose utm_content is one of our tracking codes are candidates —
    // everything else in the bank's export is simply not ours.
    const candidates = new Map<
      string,
      {
        applicationId: string | null;
        status: string | null;
        subStatus: string | null;
        stage: string | null;
        workflowStatus: string | null;
        cardIssualDate: string | null;
        raw: Record<string, string>;
      }
    >();
    dataRows.forEach((row) => {
      if (row.every((value) => value.trim() === "")) return;
      const code = extractTrackingCode(cell(row, "trackingCode"));
      if (!code) return;
      const raw: Record<string, string> = {};
      header.forEach((name, index) => {
        if (name.trim()) raw[name.trim()] = (row[index] ?? "").trim();
      });
      candidates.set(code, {
        applicationId: cell(row, "applicationId") || null,
        status: cell(row, "status") || null,
        subStatus: cell(row, "subStatus") || null,
        stage: cell(row, "stage") || null,
        workflowStatus: cell(row, "workflowStatus") || null,
        cardIssualDate: parseBankDate(cell(row, "cardIssualDate")),
        raw,
      });
    });

    let matched = 0;
    if (candidates.size > 0) {
      const existing = await db
        .select({ id: schema.bankApplyLeads.id, trackingCode: schema.bankApplyLeads.trackingCode })
        .from(schema.bankApplyLeads)
        .where(inArray(schema.bankApplyLeads.trackingCode, [...candidates.keys()]));

      if (existing.length > 0) {
        databaseOutcomeUnknown = true;
        const bankStatusUpdatedAt = new Date();
        await db.transaction(async (tx) => {
          for (const row of existing) {
            const update = candidates.get(row.trackingCode);
            if (!update) continue;
            await tx
              .update(schema.bankApplyLeads)
              .set({
                bankApplicationId: update.applicationId,
                bankStatus: update.status,
                bankSubStatus: update.subStatus,
                bankStage: update.stage,
                bankWorkflowStatus: update.workflowStatus,
                cardIssualDate: update.cardIssualDate,
                bankRaw: update.raw,
                bankStatusUpdatedAt,
                status: deriveBankLeadStatus({ status: update.status ?? undefined }),
              })
              .where(eq(schema.bankApplyLeads.id, row.id));
            matched += 1;
          }
          await tx.insert(schema.auditLog).values({
            actorId: session.user.id,
            actorEmail: session.user.email,
            action: "bank_apply_lead.reconcile",
            entityType: "bank_apply_lead",
            entityId: null,
            after: { total: dataRows.length, matched },
          });
        });
        databaseOutcomeUnknown = false;
      }
    }

    return Response.json({ ok: true, total: dataRows.length, matched });
  } catch (error) {
    console.error(
      JSON.stringify({ event: "bank_lead_import_failed", errorType: errorType(error) }),
    );
    return Response.json(
      {
        error: databaseOutcomeUnknown
          ? "We couldn't confirm this import. Reload the bank leads list before trying again."
          : "Import failed. Please try again.",
        uncertain: databaseOutcomeUnknown || undefined,
      },
      { status: databaseOutcomeUnknown ? 503 : 500 },
    );
  } finally {
    scheduleAdminRequestContextCleanup({ db, ctx });
  }
}
