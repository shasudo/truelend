import { NextResponse, type NextRequest } from "next/server";

// One canonical host: redirect www.* → apex so the site isn't served as
// duplicate content on two hostnames. (Cloudflare could also do this at the
// edge; this keeps it in the app so it can't be forgotten.)
export function middleware(request: NextRequest) {
  const host = request.headers.get("host");
  if (host?.startsWith("www.")) {
    const url = new URL(request.url);
    url.host = host.slice(4);
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/((?!_next|api/health).*)",
};
