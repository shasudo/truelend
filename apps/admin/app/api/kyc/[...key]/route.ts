import { headers } from "next/headers";
import { getAuthContext } from "@/lib/auth";

// Opened via target="_blank", so error responses must be a readable page, not
// a raw text body dumped into a blank tab. Self-contained brand-styled HTML.
function errorPage(title: string, message: string, status: number) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#faf8f3;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#14204a"><main style="max-width:22rem;padding:2rem;text-align:center"><h1 style="margin:0 0 .5rem;font-size:1.25rem;font-weight:700">${title}</h1><p style="margin:0;line-height:1.5;color:#46578f">${message}</p><p style="margin:1.25rem 0 0;font-size:.85rem;color:#6d7dac">You can close this tab and go back.</p></main></body></html>`;
  return new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store" },
  });
}

// Streams a partner's KYC document from R2 to an authenticated admin. Keys
// contain slashes (kyc/{partnerId}/{doc}), hence the catch-all. Private,
// never cached.
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { auth, env } = getAuthContext();
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user.role !== "admin") {
    return errorPage("Not allowed", "You need an admin account to view this document.", 403);
  }

  const { key } = await params;
  const obj = await env.BUCKET.get(key.join("/"));
  if (!obj) return errorPage("Document not found", "This file may have been removed.", 404);

  return new Response(obj.body as unknown as BodyInit, {
    headers: {
      "content-type": obj.httpMetadata?.contentType ?? "application/octet-stream",
      "cache-control": "private, no-store",
      "content-disposition": "inline",
    },
  });
}
