import { and, eq } from "drizzle-orm";
import { schema } from "@truelend/db";
import { withPartnerRequest } from "@/lib/auth";

/*
 * Streams one of the current partner's own KYC documents from R2 — used to
 * render the profile photo. Keys contain slashes (kyc/{partnerId}/{doc}),
 * hence the catch-all. Scoped to the caller's own partnerId in both the key
 * prefix and the database lookup: this must never become a generic
 * authenticated R2 reader that lets one partner fetch another's documents.
 */
export async function GET(req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  return withPartnerRequest(req.headers, async ({ session, partner, db, env }) => {
    if (!session || !partner) return new Response(null, { status: 401 });
    const { key } = await params;
    const r2Key = key.join("/");
    if (!r2Key.startsWith(`kyc/${partner.userId}/`)) {
      return new Response(null, { status: 404 });
    }
    const [document] = await db
      .select({ contentType: schema.partnerDocuments.contentType })
      .from(schema.partnerDocuments)
      .where(
        and(
          eq(schema.partnerDocuments.r2Key, r2Key),
          eq(schema.partnerDocuments.partnerId, partner.userId),
        ),
      )
      .limit(1);
    if (!document) return new Response(null, { status: 404 });
    const obj = await env.BUCKET.get(r2Key);
    if (!obj) return new Response(null, { status: 404 });
    return new Response(obj.body as BodyInit, {
      headers: {
        "content-type": document.contentType,
        "cache-control": "private, no-store",
        "content-disposition": "inline",
        "content-security-policy": "default-src 'none'; sandbox",
        "x-content-type-options": "nosniff",
      },
    });
  });
}
