import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { schema } from "@truelend/db";
import {
  getNotifyNewLeadCalls,
  installWebsiteDependencyMocks,
  resetFakeWebsiteState,
  setFakeWebsiteState,
  type FakeCloudflareEnv,
} from "./support/fake-website-dependencies";

installWebsiteDependencyMocks();
beforeEach(() => {
  resetFakeWebsiteState();
});
const { submitLead } = await import("../lib/lead-actions");

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
    kind: "cibil_notify",
    email: "person@example.com",
    consent: true,
    ...overrides,
  };
}

void test("submitLead: invalid input returns a validation error", async () => {
  const result = await submitLead(buildInput({ email: "not-an-email" }));

  assert.deepEqual(result, {
    ok: false,
    error: "Please check the highlighted fields and try again.",
  });
});

void test("submitLead: a rate-limited request is rejected", async () => {
  setFakeWebsiteState({
    env: buildEnv({ LEAD_RATE_LIMITER: { limit: async () => ({ success: false }) } }),
  });

  const result = await submitLead(buildInput());

  assert.deepEqual(result, {
    ok: false,
    error: "Too many requests. Please wait a minute and try again.",
  });
});

void test("submitLead: a failed Turnstile verification is rejected", async () => {
  setFakeWebsiteState({ env: buildEnv(), turnstileResult: false });

  const result = await submitLead(buildInput());

  assert.deepEqual(result, {
    ok: false,
    error: "Human verification failed — please try once more.",
  });
});

void test("submitLead: a valid submission with no ref code inserts the lead unattributed and notifies the team", async () => {
  const inserts: { table: unknown; values: Record<string, unknown> }[] = [];
  setFakeWebsiteState({
    env: buildEnv(),
    dbOptions: {
      onInsert: (table, values) => inserts.push({ table, values }),
      returningRows: (table) => (table === schema.leads ? [{ id: "lead-1" }] : []),
    },
  });

  const result = await submitLead(buildInput());

  assert.deepEqual(result, { ok: true });
  const leadInsert = inserts.find((i) => i.table === schema.leads);
  assert.equal(leadInsert?.values.kind, "cibil_notify");
  assert.equal(leadInsert.values.email, "person@example.com");
  assert.equal(leadInsert.values.partnerId, undefined);
  const auditInsert = inserts.find((i) => i.table === schema.auditLog);
  assert.equal(auditInsert?.values.action, "lead.create");
  assert.equal((auditInsert.values.after as Record<string, unknown>).source, "website_form");
  assert.deepEqual(getNotifyNewLeadCalls(), [
    {
      name: undefined,
      phone: undefined,
      email: "person@example.com",
      city: undefined,
      product: undefined,
      message: undefined,
      source: "Website · CIBIL Notify",
    },
  ]);
});

void test("submitLead: a resolved ref code attributes the lead to the referral partner", async () => {
  const inserts: { table: unknown; values: Record<string, unknown> }[] = [];
  setFakeWebsiteState({
    env: buildEnv(),
    dbOptions: {
      rawQueryRows: [{ user_id: "partner-user-1" }],
      onInsert: (table, values) => inserts.push({ table, values }),
    },
  });

  const result = await submitLead(buildInput({ ref: "RP123" }));

  assert.deepEqual(result, { ok: true });
  const leadInsert = inserts.find((i) => i.table === schema.leads);
  assert.equal(leadInsert?.values.partnerId, "partner-user-1");
  const auditInsert = inserts.find((i) => i.table === schema.auditLog);
  const after = auditInsert?.values.after as Record<string, unknown>;
  assert.equal(after.source, "referral_partner_link");
  assert.equal(after.partnerResolved, true);
  assert.equal(getNotifyNewLeadCalls()[0]?.source, "Referral Partner · RP123");
});

void test("submitLead: a transaction failure after Turnstile passes reports the ambiguous already-may-have-sent message", async () => {
  setFakeWebsiteState({
    env: buildEnv(),
    dbOptions: { transactionError: new Error("connection reset") },
  });

  const result = await submitLead(buildInput());

  assert.deepEqual(result, {
    ok: false,
    error:
      "We couldn't confirm the submission. Please contact us before retrying if you may have already sent it.",
  });
});
