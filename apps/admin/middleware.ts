import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Optimistic gate only (no DB here, per better-auth guidance): a missing
// session cookie redirects to /login; real validation happens in the
// dashboard layout via auth.api.getSession.
export function middleware(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!login|forgot-password|reset-password|api/auth|api/health|_next|icon.svg|robots.txt|favicon.ico).*)",
  ],
};
