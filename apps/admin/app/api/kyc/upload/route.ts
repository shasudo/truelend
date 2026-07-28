import { headers } from "next/headers";
import { and, eq, inArray } from "drizzle-orm";
import { schema } from "@truelend/db";
import { createAuthContext } from "@/lib/auth";
import { errorType } from "@/lib/error-type";
import {
  scheduleAdminBackgroundTask,
  scheduleAdminRequestContextCleanup,
} from "@/lib/request-context-cleanup";

const MAX_BYTES = 5 * 1024 * 1024;
const allowedContentTypes = ["image/jpeg", "image/png", "application/pdf"];
const documentTypes = schema.partnerDocType.enumValues;

function signatureMatches(contentType: string, bytes: Uint8Array): boolean {
  const startsWith = (signature: number[]) =>
    signature.every((value, index) => bytes[index] === value);
  if (contentType === "image/jpeg") return startsWith([0xff, 0xd8, 0xff]);
  if (contentType === "image/png") {
    return startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }
  return contentType === "application/pdf" && startsWith([0x25, 0x50, 0x44, 0x46]);
}

// Admin uploads remain in the private KYC bucket. The file is validated before
// R2 writes and the partner row is locked before a replacement is committed.
export async function POST(req: Request) {
  const { auth, db, ctx, env } = createAuthContext();
  let uploadedKey: string | undefined;
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
    if (Number.isFinite(contentLength) && contentLength > MAX_BYTES + 1_000_000) {
      return Response.json({ error: "File must be 5MB or smaller." }, { status: 413 });
    }
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return Response.json({ error: "Invalid upload request." }, { status: 400 });
    }
    const partnerId = String(form.get("partnerId") ?? "");
    const rawDocType = String(form.get("docType") ?? "");
    const docType = documentTypes.find((value) => value === rawDocType);
    const file = form.get("file");
    if (!partnerId || !docType) {
      return Response.json({ error: "Invalid document request." }, { status: 400 });
    }
    if (!(file instanceof File) || file.size === 0) {
      return Response.json({ error: "No file provided." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return Response.json({ error: "File must be 5MB or smaller." }, { status: 413 });
    }
    if (!allowedContentTypes.includes(file.type)) {
      return Response.json({ error: "Only JPG, PNG, or PDF files are allowed." }, { status: 400 });
    }
    if (
      !(
        await env.AUTH_RATE_LIMITER.limit({
          key: `admin-kyc-upload:${session.user.id}:${partnerId}`,
        })
      ).success
    ) {
      return Response.json({ error: "Too many uploads. Please wait a minute." }, { status: 429 });
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!signatureMatches(file.type, bytes)) {
      return Response.json({ error: "File contents do not match its type." }, { status: 400 });
    }
    const extension = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1];
    uploadedKey = `kyc/${partnerId}/${docType}-${crypto.randomUUID()}.${extension}`;
    await env.BUCKET.put(uploadedKey, bytes, { httpMetadata: { contentType: file.type } });

    databaseOutcomeUnknown = true;
    const outcome = await db.transaction(async (tx) => {
      const [partner] = await tx
        .select({ userId: schema.partners.userId, status: schema.partners.status })
        .from(schema.partners)
        .where(eq(schema.partners.userId, partnerId))
        .limit(1)
        .for("update");
      if (!partner) return { ok: false, superseded: [] as string[] };
      const reviewReset = partner.status === "verified";
      if (reviewReset) {
        await tx
          .update(schema.partners)
          .set({ status: "pending", submittedAt: new Date(), verifiedBy: null, verifiedAt: null })
          .where(eq(schema.partners.userId, partnerId));
      }
      const prior = await tx
        .select({ id: schema.partnerDocuments.id, r2Key: schema.partnerDocuments.r2Key })
        .from(schema.partnerDocuments)
        .where(
          and(
            eq(schema.partnerDocuments.partnerId, partnerId),
            eq(schema.partnerDocuments.docType, docType),
          ),
        );
      const [keep, ...duplicates] = prior;
      if (keep) {
        await tx
          .update(schema.partnerDocuments)
          .set({
            r2Key: uploadedKey!,
            contentType: file.type,
            sizeBytes: file.size,
            uploadedAt: new Date(),
          })
          .where(eq(schema.partnerDocuments.id, keep.id));
        if (duplicates.length > 0) {
          await tx.delete(schema.partnerDocuments).where(
            inArray(
              schema.partnerDocuments.id,
              duplicates.map((document) => document.id),
            ),
          );
        }
      } else {
        await tx.insert(schema.partnerDocuments).values({
          partnerId,
          docType,
          r2Key: uploadedKey!,
          contentType: file.type,
          sizeBytes: file.size,
        });
      }
      await tx.insert(schema.auditLog).values({
        actorId: session.user.id,
        actorEmail: session.user.email,
        action: "partner.admin_kyc_document_upload",
        entityType: "partner_document",
        entityId: `${partnerId}:${docType}`,
        after: { docType, contentType: file.type, sizeBytes: file.size, reviewReset },
      });
      return { ok: true, superseded: prior.map((document) => document.r2Key) };
    });
    databaseOutcomeUnknown = false;
    if (!outcome.ok) {
      await env.BUCKET.delete(uploadedKey);
      uploadedKey = undefined;
      return Response.json({ error: "Referral Partner not found." }, { status: 404 });
    }
    uploadedKey = undefined;
    if (outcome.superseded.length > 0) {
      scheduleAdminBackgroundTask(ctx, "admin_kyc_superseded_delete_failed", () =>
        Promise.all(outcome.superseded.map((key) => env.BUCKET.delete(key))),
      );
    }
    return Response.json({ ok: true });
  } catch (error) {
    // A rejected transaction promise after COMMIT does not prove rollback.
    // Preserve the private object when the database outcome is unknown so a
    // possibly committed row is never left pointing at deleted bytes.
    if (uploadedKey && !databaseOutcomeUnknown) {
      await env.BUCKET.delete(uploadedKey).catch(() => undefined);
    }
    console.error(
      JSON.stringify({
        event: "admin_kyc_upload_failed",
        errorType: errorType(error),
      }),
    );
    return Response.json(
      {
        error: databaseOutcomeUnknown
          ? "We couldn't confirm this upload. Reload the document list before trying again."
          : "Upload failed. Please try again.",
        uncertain: databaseOutcomeUnknown || undefined,
      },
      { status: databaseOutcomeUnknown ? 503 : 500 },
    );
  } finally {
    scheduleAdminRequestContextCleanup({ db, ctx });
  }
}
