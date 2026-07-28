import assert from "node:assert/strict";
import test from "node:test";
import { schema } from "@truelend/db";
import { installNextCacheMock } from "./support/fake-next-cache";
import { installPartnerAuthMock, setPartnerContext } from "./support/fake-partner-context";
import { createFakeDb, type FakeRow } from "@truelend/test-support";

installNextCacheMock();
installPartnerAuthMock();
const { submitLead } = await import("../lib/lead-actions");

const PARTNER: FakeRow = { userId: "user-1", status: "verified" };

function buildEnv(options: { rateLimited?: boolean } = {}) {
  return {
    PARTNER_WRITE_RATE_LIMITER: { limit: async () => ({ success: !options.rateLimited }) },
  };
}

function buildLeadForm(overrides: Record<string, string> = {}): FormData {
  const formData = new FormData();
  formData.set("name", "Jane Customer");
  formData.set("phone", "9876543210");
  formData.set("consent", overrides.consent ?? "on");
  return formData;
}

interface RecordedWrite {
  table: unknown;
  values: FakeRow;
}

void test("submitLead: an unverified partner is refused", async () => {
  setPartnerContext({
    db: createFakeDb(),
    session: null,
    partner: { ...PARTNER, status: "pending" },
    env: buildEnv(),
    ctx: { waitUntil: () => undefined },
  });

  const result = await submitLead({}, buildLeadForm());

  assert.equal(result.ok, undefined);
  assert.equal(typeof result.error, "string");
});

void test("submitLead: a rate-limited partner is refused before validation", async () => {
  setPartnerContext({
    db: createFakeDb(),
    session: null,
    partner: PARTNER,
    env: buildEnv({ rateLimited: true }),
    ctx: { waitUntil: () => undefined },
  });

  const result = await submitLead({}, buildLeadForm());

  assert.equal(result.ok, undefined);
  assert.equal(typeof result.error, "string");
});

void test("submitLead: a status change between the outer check and the transaction is refused without inserting", async () => {
  const inserts: RecordedWrite[] = [];
  const db = createFakeDb({
    rowsByTable: new Map<unknown, FakeRow[]>([[schema.partners, [{ status: "pending" }]]]),
    onInsert: (table, values) => inserts.push({ table, values }),
  });
  setPartnerContext({
    db,
    session: null,
    partner: PARTNER,
    env: buildEnv(),
    ctx: { waitUntil: () => undefined },
  });

  const result = await submitLead({}, buildLeadForm());

  assert.equal(result.ok, undefined);
  assert.equal(typeof result.error, "string");
  assert.equal(inserts.length, 0);
});

void test("submitLead: a valid referral is inserted and a notification is scheduled", async () => {
  const inserts: RecordedWrite[] = [];
  const scheduled: Promise<unknown>[] = [];
  const db = createFakeDb({
    rowsByTable: new Map<unknown, FakeRow[]>([[schema.partners, [{ status: "verified" }]]]),
    onInsert: (table, values) => inserts.push({ table, values }),
    returningRows: () => [{ id: "lead-1" }],
  });
  setPartnerContext({
    db,
    session: null,
    partner: PARTNER,
    env: buildEnv(),
    ctx: { waitUntil: (p: Promise<unknown>) => scheduled.push(p) },
  });

  const result = await submitLead({}, buildLeadForm());
  await Promise.all(scheduled);

  assert.deepEqual(result, { ok: true });
  assert.equal(
    inserts.some((write) => write.table === schema.leads),
    true,
  );
});

void test("submitLead: a database failure is reported with a duplicate-safe generic message", async () => {
  const db = createFakeDb({ transactionError: new Error("connection reset") });
  setPartnerContext({
    db,
    session: null,
    partner: PARTNER,
    env: buildEnv(),
    ctx: { waitUntil: () => undefined },
  });

  const result = await submitLead({}, buildLeadForm());

  assert.equal(result.ok, undefined);
  assert.equal(typeof result.error, "string");
});
