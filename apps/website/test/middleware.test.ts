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
});
