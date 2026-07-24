import { and, eq, inArray } from "drizzle-orm";
import { schema } from "@truelend/db";
import { isKycEditable } from "@truelend/reference";
import { requirePartnerApi } from "@/lib/auth";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "application/pdf"];
const DOC_TYPES = schema.partnerDocType.enumValues;

// The browser-supplied file.type is attacker-controlled — verify the actual
// magic bytes match so a script can't smuggle in a mislabelled file.
function signatureMatches(mime: string, bytes: Uint8Array): boolean {
  const starts = (sig: number[]) => sig.every((v, i) => bytes[i] === v);
  if (mime === "image/jpeg") return starts([0xff, 0xd8, 0xff]);
  if (mime === "image/png") return starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (mime === "application/pdf") return starts([0x25, 0x50, 0x44, 0x46]); // %PDF
  return false;
}

// One file per request. workerd coerces an empty file input to "" — guard
// instanceof File + size. The admin app reads these back via its own bucket
// binding behind admin auth.
export async function POST(req: Request) {
  const gate = await requirePartnerApi();
  if (gate instanceof Response) return gate;
  const { partner, db, ctx, env } = gate;
  let uploadedKey: string | undefined;
  try {
    const expectedOrigin = new URL(env.BETTER_AUTH_URL).origin;
    const origin = req.headers.get("origin");
    const fetchSite = req.headers.get("sec-fetch-site");
    if (origin !== expectedOrigin || (fetchSite && fetchSite !== "same-origin")) {
      return Response.json({ error: "Invalid upload origin" }, { status: 403 });
    }
    // Reject obviously oversized multipart requests before materializing them.
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_BYTES + 1_000_000) {
      return Response.json({ error: "File must be 5MB or smaller" }, { status: 413 });
    }
    if (!isKycEditable(partner)) {
      return Response.json(
        { error: "Your documents are locked and can't be changed." },
        { status: 403 },
      );
    }
    if (!(await env.PARTNER_WRITE_RATE_LIMITER.limit({ key: `kyc:${partner.userId}` })).success) {
      return Response.json({ error: "Too many uploads. Please wait a minute." }, { status: 429 });
    }
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return Response.json({ error: "Invalid upload request" }, { status: 400 });
    }
    const rawDocType = String(form.get("docType") ?? "");
    const docType = DOC_TYPES.find((value) => value === rawDocType);
    const file = form.get("file");
    if (!docType) return Response.json({ error: "Unknown document type" }, { status: 400 });
    if (!(file instanceof File) || file.size === 0) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return Response.json({ error: "File must be 5MB or smaller" }, { status: 413 });
    }
    if (!ALLOWED.includes(file.type)) {
      return Response.json({ error: "Only JPG, PNG or PDF" }, { status: 400 });
    }

    // Files are ≤5MB, so buffering is bounded. Sniff before anything touches R2.
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!signatureMatches(file.type, bytes)) {
      return Response.json(
        { error: "File contents don't match a JPG, PNG or PDF" },
        { status: 400 },
      );
    }
    const ext = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1];
    uploadedKey = `kyc/${partner.userId}/${docType}-${crypto.randomUUID()}.${ext}`;
    await env.BUCKET.put(uploadedKey, bytes, {
      httpMetadata: { contentType: file.type },
    });

    const outcome = await db.transaction(async (tx) => {
      // Serialize all document writes for a partner, then recheck editability
      // against the current row so review/approval cannot race an upload.
      const [currentPartner] = await tx
        .select()
        .from(schema.partners)
        .where(eq(schema.partners.userId, partner.userId))
        .limit(1)
        .for("update");
      if (!currentPartner) return { status: 403 as const, superseded: [] as string[] };
      if (!isKycEditable(currentPartner)) {
        return { status: 409 as const, superseded: [] as string[] };
      }
      const prior = await tx
        .select({ id: schema.partnerDocuments.id, r2Key: schema.partnerDocuments.r2Key })
        .from(schema.partnerDocuments)
        .where(
          and(
            eq(schema.partnerDocuments.partnerId, partner.userId),
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
          partnerId: partner.userId,
          docType,
          r2Key: uploadedKey!,
          contentType: file.type,
          sizeBytes: file.size,
        });
      }
      await tx.insert(schema.auditLog).values({
        actorId: partner.userId,
        action: "partner.kyc_document_upload",
        entityType: "partner_document",
        entityId: `${partner.userId}:${docType}`,
        after: { docType, contentType: file.type, sizeBytes: file.size },
      });
      return { status: 200 as const, superseded: prior.map((document) => document.r2Key) };
    });

    if (outcome.status !== 200) {
      await env.BUCKET.delete(uploadedKey);
      uploadedKey = undefined;
      return Response.json(
        {
          error:
            outcome.status === 409
              ? "Your documents were locked while this upload was in progress."
              : "No Referral Partner profile",
        },
        { status: outcome.status },
      );
    }
    uploadedKey = undefined; // committed: the database now owns this object
    if (outcome.superseded.length > 0) {
      ctx.waitUntil(Promise.all(outcome.superseded.map((key) => env.BUCKET.delete(key))));
    }
    return Response.json({ ok: true });
  } catch (error) {
    if (uploadedKey) await env.BUCKET.delete(uploadedKey).catch(() => undefined);
    console.error(
      JSON.stringify({
        event: "kyc_upload_failed",
        partnerId: partner.userId,
        error: error instanceof Error ? error.message : "unknown",
      }),
    );
    return Response.json({ error: "Upload failed. Please try again." }, { status: 500 });
  } finally {
    ctx.waitUntil(db.$client.end());
  }
}
