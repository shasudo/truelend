import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";

// getSessionCookie is pure header parsing (no I/O), so no mocks are needed —
// still imported dynamically to keep the "modules under test are always
// dynamically imported" convention uniform across every test file.
const { middleware } = await import("../middleware");

void test("no session cookie redirects to /login, dropping the original path", async () => {
  const request = new NextRequest("https://partner.example.com/dashboard/settings?tab=notes");

  const response = middleware(request);

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "https://partner.example.com/login");
});

void test("a present session cookie passes the request through", async () => {
  const request = new NextRequest("https://partner.example.com/dashboard/settings", {
    headers: { cookie: "better-auth.session_token=abc123" },
  });

  const response = middleware(request);

  assert.equal(response.headers.get("location"), null);
});
