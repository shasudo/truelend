import assert from "node:assert/strict";
import test from "node:test";
import { retryRead } from "../lib/retry-read";

void test("retries a failed read once", async () => {
  let attempts = 0;

  const value = await retryRead("test_read_retry", async () => {
    attempts += 1;
    if (attempts === 1) throw new Error("temporary failure");
    return "available";
  });

  assert.equal(value, "available");
  assert.equal(attempts, 2);
});

void test("does not repeat a successful read", async () => {
  let attempts = 0;

  const value = await retryRead("test_read_retry", async () => {
    attempts += 1;
    return "available";
  });

  assert.equal(value, "available");
  assert.equal(attempts, 1);
});
