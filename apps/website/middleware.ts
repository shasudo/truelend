import { NextResponse, type NextRequest } from "next/server";
import { ATTRIBUTION_TTL_MS, REF_COOKIE, refFromSearch } from "@/lib/attribution";

// One canonical host: redirect www.* → apex so the site isn't served as
// duplicate content on two hostnames. (Cloudflare could also do this at the
// edge; this keeps it in the app so it can't be forgotten.)
export function middleware(request: NextRequest) {
  const host = request.headers.get("host");
  if (host?.startsWith("www.")) {
    const url = new URL(request.url);
    url.host = host.slice(4);
    // The query string rides along, so the apex request banks the ref below.
    return NextResponse.redirect(url, 308);
  }

  const response = NextResponse.next();
  // Bank the Referral Partner code on whatever page the link lands on. The
  // client-side store only runs on pages that render a lead form, and it is
  // unavailable in in-app browsers that block storage — both silently lose
  // credit. Set-Cookie is emitted only on a ?ref= hit, so ordinary page
  // responses stay cacheable. Last click wins here too, matching resolveAttribution.
  const ref = refFromSearch(request.nextUrl.searchParams);
  if (ref) {
    response.cookies.set(REF_COOKIE, ref, {
      maxAge: ATTRIBUTION_TTL_MS / 1_000,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    // Most pages here are statically rendered. A shared cache must never store
    // this response, or one borrower's partner code would be handed to the next
    // visitor of the same URL.
    response.headers.set("cache-control", "private, no-store");
    // Next mirrors every middleware-set cookie into this internal header so the
    // same render can observe it via cookies(). OpenNext strips it on the SSR
    // path but not on the cache-interception path this site's prerendered pages
    // take, which would publish an httpOnly value as a readable header. Nothing
    // here reads the cookie during SSR — only the later server action does.
    response.headers.delete("x-middleware-set-cookie");
  }
  return response;
}

export const config = {
  matcher: "/((?!_next|api/health).*)",
};
