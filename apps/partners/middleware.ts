import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Optimistic gate for the dashboard group only; public pages (/,
// /register/business, /register/referral, /login, /resources) stay open. Real
// validation + status gating happens in the (dashboard) layout via requirePartner.
export function middleware(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/kyc/:path*",
    "/leads/:path*",
    "/refer/:path*",
    "/profile/:path*",
  ],
};
