import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { schema } from "@truelend/db";
import { appUrls } from "@truelend/reference";
import {
  getNotifyNewLeadCalls,
  getPartnerLeadNoticeCalls,
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

/** A kind a referral link is actually for — the partner-facing email is gated on it. */
function buildReferralInput(overrides: Record<string, unknown> = {}) {
  return {
    kind: "referral",
    referrerName: "Ravi Kumar",
    referrerPhone: "9876543210",
    name: "Priya Sharma",
    phone: "9812345678",
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
      // Derived from the inserted row, so a resubmitted form collapses to one
      // alert inside the provider's 24-hour idempotency window.
      idempotencyKey: "new_lead:lead-1",
    },
  ]);
});

void test("submitLead: a resolved ref code attributes the lead and tells the partner", async () => {
  const inserts: { table: unknown; values: Record<string, unknown> }[] = [];
  setFakeWebsiteState({
    env: buildEnv(),
    dbOptions: {
      rawQueryRows: [{ user_id: "partner-user-1", name: "Asha", email: "asha@example.com" }],
      onInsert: (table, values) => inserts.push({ table, values }),
      returningRows: (table) => (table === schema.leads ? [{ id: "lead-1" }] : []),
    },
  });

  const result = await submitLead(buildReferralInput({ ref: "RP100123" }));

  assert.deepEqual(result, { ok: true });
  const leadInsert = inserts.find((i) => i.table === schema.leads);
  assert.equal(leadInsert?.values.partnerId, "partner-user-1");
  const auditInsert = inserts.find((i) => i.table === schema.auditLog);
  const after = auditInsert?.values.after as Record<string, unknown>;
  assert.equal(after.source, "referral_partner_link");
  assert.equal(after.partnerResolved, true);
  assert.equal(getNotifyNewLeadCalls()[0]?.source, "Referral Partner · RP100123");
  // The partner is the only party who would notice a broken link, so they hear
  // about the arrival rather than waiting for a much later stage change.
  assert.deepEqual(getPartnerLeadNoticeCalls(), [
    {
      to: "asha@example.com",
      name: "Asha",
      leadName: "Priya Sharma",
      status: "new",
      dashboardUrl: `${appUrls.partners}/dashboard`,
      idempotencyKey: "partner_lead_status:lead-1:new",
    },
  ]);
});

void test("submitLead: a contact or CIBIL submission never mails the partner a stranger's name", async () => {
  setFakeWebsiteState({
    env: buildEnv(),
    refCookie: "RP100123",
    dbOptions: {
      rawQueryRows: [{ user_id: "partner-user-1", name: "Asha", email: "asha@example.com" }],
    },
  });

  // The ref survives 30 days across every form on the site. Someone using the
  // CIBIL signup on a shared device is not that partner's referral.
  const result = await submitLead(buildInput());

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(getPartnerLeadNoticeCalls(), []);
});

void test("submitLead: the middleware ref cookie credits a submission whose payload lost the ref", async () => {
  const inserts: { table: unknown; values: Record<string, unknown> }[] = [];
  setFakeWebsiteState({
    env: buildEnv(),
    refCookie: "RP100123",
    dbOptions: {
      rawQueryRows: [{ user_id: "partner-user-1", name: "Asha", email: null }],
      onInsert: (table, values) => inserts.push({ table, values }),
    },
  });

  // No `ref` in the payload: storage was blocked, or the borrower hopped to a
  // page with no form before submitting. The cookie is the fallback.
  const result = await submitLead(buildInput());

  assert.deepEqual(result, { ok: true });
  assert.equal(inserts.find((i) => i.table === schema.leads)?.values.partnerId, "partner-user-1");
  // No partner email on file — the notification stays silent rather than failing.
  assert.deepEqual(getPartnerLeadNoticeCalls(), []);
});

void test("submitLead: the cookie wins over a staler ref in the payload", async () => {
  const inserts: { table: unknown; values: Record<string, unknown> }[] = [];
  setFakeWebsiteState({
    env: buildEnv(),
    refCookie: "RP100999",
    dbOptions: {
      rawQueryRows: [{ user_id: "partner-user-2", name: "Bela", email: null }],
      onInsert: (table, values) => inserts.push({ table, values }),
    },
  });

  // Middleware banks the cookie on every ?ref= hit; the client store only updates
  // on pages that render a form, so it can lag a click made on a page without one.
  const result = await submitLead(buildInput({ ref: "RP100123" }));

  assert.deepEqual(result, { ok: true });
  const after = inserts.find((i) => i.table === schema.auditLog)?.values.after as Record<
    string,
    unknown
  >;
  assert.equal(after.partnerRef, "RP100999");
});

void test("submitLead: a malformed ref is rejected at the server boundary, not passed to the lookup", async () => {
  const inserts: { table: unknown; values: Record<string, unknown> }[] = [];
  setFakeWebsiteState({
    env: buildEnv(),
    dbOptions: {
      rawQueryRows: [{ user_id: "partner-user-1", name: "Asha", email: "asha@example.com" }],
      onInsert: (table, values) => inserts.push({ table, values }),
    },
  });

  // A hand-crafted POST can send anything; only RP<seq> is a reference id.
  const result = await submitLead(buildInput({ ref: "BP100123" }));

  assert.deepEqual(result, { ok: true });
  const auditInsert = inserts.find((i) => i.table === schema.auditLog);
  const after = auditInsert?.values.after as Record<string, unknown>;
  assert.equal(after.source, "website_form");
  assert.equal(after.partnerRef, undefined);
});

void test("submitLead: an unresolvable ref still stores the lead, flagged as an unresolved link", async () => {
  const inserts: { table: unknown; values: Record<string, unknown> }[] = [];
  setFakeWebsiteState({
    env: buildEnv(),
    dbOptions: {
      rawQueryRows: [],
      onInsert: (table, values) => inserts.push({ table, values }),
    },
  });

  const result = await submitLead(buildInput({ ref: "RP100123" }));

  assert.deepEqual(result, { ok: true });
  assert.equal(inserts.find((i) => i.table === schema.leads)?.values.partnerId, undefined);
  const after = inserts.find((i) => i.table === schema.auditLog)?.values.after as Record<
    string,
    unknown
  >;
  assert.equal(after.source, "unresolved_referral_partner_link");
  assert.equal(after.partnerResolved, false);
  // Ops sees the dead code in the alert instead of it looking like a direct lead.
  assert.equal(
    getNotifyNewLeadCalls()[0]?.source,
    "Website · CIBIL Notify · unresolved ref RP100123",
  );
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
