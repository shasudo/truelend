import { and, eq, inArray } from "drizzle-orm";
import { schema } from "@truelend/db";
import { requirePartnerApi } from "@/lib/auth";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "application/pdf"];
const DOC_TYPES = schema.partnerDocType.enumValues;

// One file per request. workerd coerces an empty file input to "" — guard
// instanceof File + size. The admin app reads these back via its own bucket
// binding behind admin auth.
export async function POST(req: Request) {
  const gate = await requirePartnerApi();
  if (gate instanceof Response) return gate;
  const { partner, db, ctx, env } = gate;

  const form = await req.formData();
  const rawDocType = String(form.get("docType") ?? "");
  const docType = DOC_TYPES.find((v) => v === rawDocType);
  const file = form.get("file");

  if (!docType) {
    return Response.json({ error: "Unknown document type" }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "File must be 5MB or smaller" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return Response.json({ error: "Only JPG, PNG or PDF" }, { status: 400 });
  }

  const ext = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1];
  const key = `kyc/${partner.userId}/${docType}-${crypto.randomUUID()}.${ext}`;

  // Files are ≤5MB, so buffering to an ArrayBuffer is fine and avoids the
  // DOM-vs-workers ReadableStream type mismatch.
  await env.BUCKET.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });

  try {
    // A partner keeps exactly one doc per type: supersede any prior upload of
    // this type — insert the new row, then drop the old rows and their R2
    // objects (so re-uploads don't leave orphaned files in the bucket).
    const superseded = await db
      .select({ id: schema.partnerDocuments.id, r2Key: schema.partnerDocuments.r2Key })
      .from(schema.partnerDocuments)
      .where(
        and(
          eq(schema.partnerDocuments.partnerId, partner.userId),
          eq(schema.partnerDocuments.docType, docType),
        ),
      );

    await db.insert(schema.partnerDocuments).values({
      partnerId: partner.userId,
      docType,
      r2Key: key,
      contentType: file.type,
      sizeBytes: file.size,
    });

    if (superseded.length > 0) {
      await db.delete(schema.partnerDocuments).where(
        inArray(
          schema.partnerDocuments.id,
          superseded.map((d) => d.id),
        ),
      );
      // Best-effort object cleanup — don't block the response on it.
      ctx.waitUntil(Promise.all(superseded.map((d) => env.BUCKET.delete(d.r2Key))));
    }
  } finally {
    ctx.waitUntil(db.$client.end());
  }

  return Response.json({ ok: true });
}
