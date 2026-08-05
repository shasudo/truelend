import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { schema } from "@truelend/db";
import {
  installWebsiteDependencyMocks,
  resetFakeWebsiteState,
  setFakeWebsiteState,
  type FakeCloudflareEnv,
} from "./support/fake-website-dependencies";

installWebsiteDependencyMocks();
beforeEach(() => {
  resetFakeWebsiteState();
});
const { startBankApply } = await import("../lib/bank-apply-actions");

function buildEnv(overrides: Partial<FakeCloudflareEnv> = {}): FakeCloudflareEnv {
  return {
    HYPERDRIVE: { connectionString: "postgres://fake" },
    LEAD_RATE_LIMITER: { limit: async () => ({ success: true }) },
    TURNSTILE_SECRET_KEY: "secret",
    ...overrides,
  };
}

function buildInput(overrides: Record<string, unknown> = {}) {
  return {
    productSlug: "indusind-credit-card",
    phone: "9812345678",
    consent: true,
    turnstileToken: "token",
    ...overrides,
  };
}

void test("startBankApply: invalid input returns a validation error", async () => {
  const result = await startBankApply(buildInput({ phone: "not-a-phone" }));

  assert.deepEqual(result, {
    ok: false,
    error: "Please check the highlighted fields and try again.",
  });
});

void test("startBankApply: an unknown product slug is refused", async () => {
  const result = await startBankApply(buildInput({ productSlug: "some-other-card" }));

  assert.deepEqual(result, {
    ok: false,
    error: "Please check the highlighted fields and try again.",
  });
});

void test("startBankApply: a rate-limited request is rejected", async () => {
  setFakeWebsiteState({
    env: buildEnv({ LEAD_RATE_LIMITER: { limit: async () => ({ success: false }) } }),
  });

  const result = await startBankApply(buildInput());

  assert.deepEqual(result, {
    ok: false,
    error: "Too many requests. Please wait a minute and try again.",
  });
});

void test("startBankApply: a failed Turnstile verification is rejected", async () => {
  setFakeWebsiteState({ env: buildEnv(), turnstileResult: false });

  const result = await startBankApply(buildInput());

  assert.deepEqual(result, {
    ok: false,
    error: "Human verification failed — please try once more.",
  });
});

void test("startBankApply: a valid submission with no ref inserts an unattributed row and redirects with a tracking code", async () => {
  const inserts: { table: unknown; values: Record<string, unknown> }[] = [];
  setFakeWebsiteState({
    env: buildEnv(),
    dbOptions: {
      onInsert: (table, values) => inserts.push({ table, values }),
      returningRows: (table) => (table === schema.bankApplyLeads ? [{ id: "bank-lead-1" }] : []),
    },
  });

  const result = await startBankApply(buildInput());

  assert.ok(result.ok);
  assert.match(result.redirectUrl, /utm_content=TRUE\d{8}$/);
  const leadInsert = inserts.find((i) => i.table === schema.bankApplyLeads);
  assert.equal(leadInsert?.values.phone, "9812345678");
  assert.equal(leadInsert.values.productSlug, "indusind-credit-card");
  assert.equal(leadInsert.values.partnerId, undefined);
  assert.equal(leadInsert.values.consent, true);
  const auditInsert = inserts.find((i) => i.table === schema.auditLog);
  assert.equal(auditInsert?.values.action, "bank_apply_lead.create");
});

void test("startBankApply: a resolved ref code attributes the row to the partner", async () => {
  const inserts: { table: unknown; values: Record<string, unknown> }[] = [];
  setFakeWebsiteState({
    env: buildEnv(),
    refCookie: "RP100000",
    dbOptions: {
      rawQueryRows: [{ user_id: "partner-1", name: "Ravi Kumar", email: "ravi@example.com" }],
      onInsert: (table, values) => inserts.push({ table, values }),
      returningRows: (table) => (table === schema.bankApplyLeads ? [{ id: "bank-lead-1" }] : []),
    },
  });

  const result = await startBankApply(buildInput());

  assert.equal(result.ok, true);
  const leadInsert = inserts.find((i) => i.table === schema.bankApplyLeads);
  assert.equal(leadInsert?.values.partnerId, "partner-1");
});

void test("startBankApply: an unresolvable ref still succeeds, unattributed", async () => {
  const inserts: { table: unknown; values: Record<string, unknown> }[] = [];
  setFakeWebsiteState({
    env: buildEnv(),
    refCookie: "RP999999",
    dbOptions: {
      rawQueryRows: [],
      onInsert: (table, values) => inserts.push({ table, values }),
      returningRows: (table) => (table === schema.bankApplyLeads ? [{ id: "bank-lead-1" }] : []),
    },
  });

  const result = await startBankApply(buildInput());

  assert.equal(result.ok, true);
  const leadInsert = inserts.find((i) => i.table === schema.bankApplyLeads);
  assert.equal(leadInsert?.values.partnerId, undefined);
});

void test("startBankApply: a non-collision transaction failure is reported, not retried into success", async () => {
  setFakeWebsiteState({
    env: buildEnv(),
    dbOptions: { transactionError: new Error("connection reset") },
  });

  const result = await startBankApply(buildInput());

  assert.deepEqual(result, {
    ok: false,
    error: "Something went wrong on our side. Please try again.",
  });
});
