import { headers } from "next/headers";
import { getAuthContext } from "@/lib/auth";

// Streams a partner's KYC document from R2 to an authenticated admin. Keys
// contain slashes (kyc/{partnerId}/{doc}), hence the catch-all. Private,
// never cached.
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { auth, env } = getAuthContext();
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const { key } = await params;
  const obj = await env.BUCKET.get(key.join("/"));
  if (!obj) return new Response("Not found", { status: 404 });

  return new Response(obj.body as unknown as BodyInit, {
    headers: {
      "content-type": obj.httpMetadata?.contentType ?? "application/octet-stream",
      "cache-control": "private, no-store",
      "content-disposition": "inline",
    },
  });
}
