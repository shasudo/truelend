import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";

// A pure function of the request's Host header — no mocks needed. Still
// imported dynamically to keep the "modules under test are always
// dynamically imported" convention uniform across every test file.
const { middleware } = await import("../middleware");

void test("a www. host redirects to the apex host, preserving path and query", async () => {
  const request = new NextRequest("https://www.example.com/products?x=1", {
    headers: { host: "www.example.com" },
  });

  const response = middleware(request);

  assert.equal(response.status, 308);
  assert.equal(response.headers.get("location"), "https://example.com/products?x=1");
});

void test("a non-www host passes through unmodified", async () => {
  const request = new NextRequest("https://example.com/products", {
    headers: { host: "example.com" },
  });

  const response = middleware(request);

  assert.equal(response.headers.get("location"), null);
  // No ref, no Set-Cookie — ordinary page responses stay cacheable.
  assert.equal(response.headers.get("set-cookie"), null);
});

void test("a ?ref= on any page banks the Referral Partner code in a cookie", async () => {
  // A blog post, not a form page: the client-side store never runs here, which
  // is how link credit used to evaporate on the first internal click.
  const request = new NextRequest("https://example.com/blog/a-post?ref=rp100022", {
    headers: { host: "example.com" },
  });

  const response = middleware(request);
  const cookie = response.cookies.get("tl-ref");

  assert.ok(cookie);
  assert.equal(cookie.value, "RP100022"); // normalized by sanitizeRef
  assert.equal(cookie.httpOnly, true);
  assert.equal(cookie.sameSite, "lax");
  // A shared cache storing this response would hand one borrower's partner
  // code to the next visitor of the same static page.
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  // OpenNext strips this Next internal only on the SSR path, so a prerendered
  // page would otherwise publish the httpOnly cookie as a readable header.
  assert.equal(response.headers.get("x-middleware-set-cookie"), null);
});

void test("a malformed ?ref= is not banked", async () => {
  const request = new NextRequest("https://example.com/?ref=DROP TABLE partners", {
    headers: { host: "example.com" },
  });

  assert.equal(middleware(request).cookies.get("tl-ref"), undefined);
});
