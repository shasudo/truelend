import { and, eq, inArray } from "drizzle-orm";
import { schema } from "@truelend/db";
import { requirePartnerApi } from "@/lib/auth";
import { kycEditable } from "@/lib/onboarding";

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

  // Docs are frozen once the application is under review or verified.
  if (!kycEditable(partner)) {
    return Response.json(
      { error: "Your documents are locked and can't be changed." },
      { status: 403 },
    );
  }

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

  // Files are ≤5MB, so buffering to an ArrayBuffer is fine and avoids the
  // DOM-vs-workers ReadableStream type mismatch. Buffer first so we can sniff
  // the magic bytes before anything touches R2.
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!signatureMatches(file.type, bytes)) {
    return Response.json({ error: "File contents don't match a JPG, PNG or PDF" }, { status: 400 });
  }

  const ext = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1];
  const key = `kyc/${partner.userId}/${docType}-${crypto.randomUUID()}.${ext}`;

  await env.BUCKET.put(key, bytes, {
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
