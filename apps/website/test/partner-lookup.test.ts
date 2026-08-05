import assert from "node:assert/strict";
import test from "node:test";
import { createFakeDb } from "@truelend/test-support";
import type { Database } from "@truelend/db";
import { resolvePartnerByRef } from "../lib/partner-lookup";

void test("resolvePartnerByRef: no ref code returns no partner and no failure", async () => {
  const db = createFakeDb() as unknown as Database;

  const result = await resolvePartnerByRef(db, undefined, "lead");

  assert.deepEqual(result, { refLookupFailed: false });
});

void test("resolvePartnerByRef: a matching row resolves the partner", async () => {
  const db = createFakeDb({
    rawQueryRows: [{ user_id: "user-1", name: "Ravi Kumar", email: "ravi@example.com" }],
  }) as unknown as Database;

  const result = await resolvePartnerByRef(db, "RP1001", "lead");

  assert.deepEqual(result, {
    refLookupFailed: false,
    partner: { userId: "user-1", name: "Ravi Kumar", email: "ravi@example.com" },
  });
});

void test("resolvePartnerByRef: no matching row resolves undefined without a failure", async () => {
  const db = createFakeDb({ rawQueryRows: [] }) as unknown as Database;

  const result = await resolvePartnerByRef(db, "RP1001", "lead");

  assert.deepEqual(result, { refLookupFailed: false });
});

void test("resolvePartnerByRef: a lookup error degrades to unresolved rather than throwing", async () => {
  const db = {
    $client: async () => Promise.reject(new Error("connection lost")),
  } as unknown as Database;

  const result = await resolvePartnerByRef(db, "RP1001", "lead");

  assert.deepEqual(result, { refLookupFailed: true });
});
