import assert from "node:assert/strict";
import test from "node:test";
import { schema } from "@truelend/db";
import { installNextCacheMock } from "./support/fake-next-cache";
import {
  buildSession,
  installWithPartnerMutationMock,
  setPartnerContext,
} from "./support/fake-partner-context";
import { createFakeDb, type FakeRow } from "@truelend/test-support";
import { ALL_PARTNER_DOC_TYPES, buildPartnerRow } from "./support/fixtures";
import type { KycState } from "../lib/kyc-actions";

// The mocks must be registered before ../lib/kyc-actions is imported, so the
// module under test is loaded dynamically, after installing them — a static
// top-level import would evaluate (and bind kyc-actions.ts's real "./auth"
// import) before any of this file's own code runs.
installNextCacheMock();
installWithPartnerMutationMock();
const { savePartnerKyc, submitForReview, reopenApplication } = await import("../lib/kyc-actions");

const EMPTY_STATE: KycState = {};

function buildValidKycFormData(overrides: Record<string, string> = {}): FormData {
  const formData = new FormData();
  const fields: Record<string, string> = {
    pan: "ABCDE1234F",
    address: "123 Example Street, Example City",
    bankName: "Example Bank",
    accountHolder: "Test Partner",
    accountNumber: "123456789012",
    bankBranch: "Main Branch",
    ifsc: "HDFC0001234",
    nomineeName: "Nominee Name",
    nomineePhone: "9876543211",
    occupation: "Sales",
    designation: "Manager",
    ...overrides,
  };
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

interface RecordedWrite {
  table: unknown;
  values: FakeRow;
}

function trackedDb(options: {
  partner?: FakeRow;
  documentTypes?: ReadonlySet<string>;
  transactionError?: unknown;
}) {
  const updates: RecordedWrite[] = [];
  const inserts: RecordedWrite[] = [];
  const rowsByTable = new Map<unknown, FakeRow[]>();
  if (options.partner) rowsByTable.set(schema.partners, [options.partner]);
  rowsByTable.set(
    schema.partnerDocuments,
    [...(options.documentTypes ?? ALL_PARTNER_DOC_TYPES)].map((docType) => ({ docType })),
  );
  const db = createFakeDb({
    rowsByTable,
    onUpdate: (table, values) => updates.push({ table, values }),
    onInsert: (table, values) => inserts.push({ table, values }),
    transactionError: options.transactionError,
  });
  return { db, updates, inserts };
}

// ---- savePartnerKyc ---------------------------------------------------

void test("savePartnerKyc: no session returns an error and never opens a transaction", async () => {
  const { db, updates, inserts } = trackedDb({ partner: buildPartnerRow() });
  setPartnerContext({ db, session: null });

  const result = await savePartnerKyc(EMPTY_STATE, buildValidKycFormData());

  assert.equal(result.ok, undefined);
  assert.equal(typeof result.error, "string");
  assert.equal(updates.length, 0);
  assert.equal(inserts.length, 0);
});

void test("savePartnerKyc: invalid input returns an error without writing to the database", async () => {
  const { db, updates } = trackedDb({ partner: buildPartnerRow() });
  setPartnerContext({ db, session: buildSession() });

  const result = await savePartnerKyc(EMPTY_STATE, buildValidKycFormData({ pan: "not-a-pan" }));

  assert.equal(result.ok, undefined);
  assert.equal(typeof result.error, "string");
  assert.equal(updates.length, 0);
});

void test("savePartnerKyc: locked while under review returns an error without writing", async () => {
  const partner = buildPartnerRow({ status: "pending", submittedAt: new Date() });
  const { db, updates } = trackedDb({ partner });
  setPartnerContext({ db, session: buildSession() });

  const result = await savePartnerKyc(EMPTY_STATE, buildValidKycFormData());

  assert.equal(result.ok, undefined);
  assert.equal(typeof result.error, "string");
  assert.equal(updates.length, 0);
});

void test("savePartnerKyc: happy path updates the partner row and redacts the audit log", async () => {
  const partner = buildPartnerRow({ status: "pending", submittedAt: null });
  const { db, updates, inserts } = trackedDb({ partner });
  setPartnerContext({ db, session: buildSession() });

  const result = await savePartnerKyc(EMPTY_STATE, buildValidKycFormData());

  assert.deepEqual(result, { ok: true });
  assert.equal(updates.length, 1);
  assert.equal(updates[0]?.table, schema.partners);
  assert.equal(updates[0].values.pan, "ABCDE1234F");
  assert.equal(inserts.length, 1);
  const auditAfter = inserts[0]?.values.after as { fields: string[] };
  assert.ok(auditAfter.fields.includes("pan"));
  assert.ok(!JSON.stringify(inserts[0]?.values).includes("ABCDE1234F"));
});

void test("savePartnerKyc: a failure inside the transaction returns a generic error", async () => {
  const { db } = trackedDb({ partner: buildPartnerRow(), transactionError: new Error("db down") });
  setPartnerContext({ db, session: buildSession() });

  const result = await savePartnerKyc(EMPTY_STATE, buildValidKycFormData());

  assert.equal(result.ok, undefined);
  assert.equal(typeof result.error, "string");
});

// ---- submitForReview ---------------------------------------------------

void test("submitForReview: no session returns an error", async () => {
  const { db } = trackedDb({ partner: buildPartnerRow() });
  setPartnerContext({ db, session: null });

  const result = await submitForReview(EMPTY_STATE, new FormData());

  assert.equal(result.ok, undefined);
  assert.equal(typeof result.error, "string");
});

void test("submitForReview: already submitted is an idempotent no-op with no writes", async () => {
  const partner = buildPartnerRow({ status: "pending", submittedAt: new Date() });
  const { db, updates, inserts } = trackedDb({ partner });
  setPartnerContext({ db, session: buildSession() });

  const result = await submitForReview(EMPTY_STATE, new FormData());

  assert.deepEqual(result, { ok: true });
  assert.equal(updates.length, 0);
  assert.equal(inserts.length, 0);
});

void test("submitForReview: an incomplete application is rejected without writing", async () => {
  const partner = buildPartnerRow({ status: "pending", submittedAt: null });
  const { db, updates } = trackedDb({ partner, documentTypes: new Set() });
  setPartnerContext({ db, session: buildSession() });

  const result = await submitForReview(EMPTY_STATE, new FormData());

  assert.equal(result.ok, undefined);
  assert.equal(typeof result.error, "string");
  assert.equal(updates.length, 0);
});

void test("submitForReview: a fresh complete application is submitted for review", async () => {
  const partner = buildPartnerRow({ status: "pending", submittedAt: null });
  const { db, updates, inserts } = trackedDb({ partner });
  setPartnerContext({ db, session: buildSession() });

  const result = await submitForReview(EMPTY_STATE, new FormData());

  assert.deepEqual(result, { ok: true });
  assert.equal(updates.length, 1);
  assert.equal(updates[0]?.values.status, "pending");
  assert.equal(updates[0].values.rejectionReason, null);
  assert.equal(inserts.length, 1);
});

void test("submitForReview: a rejected partner can resubmit", async () => {
  const partner = buildPartnerRow({
    status: "rejected",
    submittedAt: new Date("2025-01-01"),
    rejectionReason: "incomplete documents",
  });
  const { db, updates } = trackedDb({ partner });
  setPartnerContext({ db, session: buildSession() });

  const result = await submitForReview(EMPTY_STATE, new FormData());

  assert.deepEqual(result, { ok: true });
  assert.equal(updates.length, 1);
});

void test(
  "submitForReview: a verified partner is blocked, indirectly — via isKycEditable's " +
    "canSubmit gate, not an explicit status check in this function itself",
  async () => {
    const partner = buildPartnerRow({ status: "verified", submittedAt: null });
    const { db, updates } = trackedDb({ partner });
    setPartnerContext({ db, session: buildSession() });

    const result = await submitForReview(EMPTY_STATE, new FormData());

    assert.equal(result.ok, undefined);
    assert.equal(typeof result.error, "string");
    assert.equal(updates.length, 0);
  },
);

void test("submitForReview: a failure inside the transaction returns a generic error", async () => {
  const { db } = trackedDb({ partner: buildPartnerRow(), transactionError: new Error("db down") });
  setPartnerContext({ db, session: buildSession() });

  const result = await submitForReview(EMPTY_STATE, new FormData());

  assert.equal(result.ok, undefined);
  assert.equal(typeof result.error, "string");
});

// ---- reopenApplication --------------------------------------------------

void test("reopenApplication: no session returns an error", async () => {
  const { db } = trackedDb({ partner: buildPartnerRow() });
  setPartnerContext({ db, session: null });

  const result = await reopenApplication(EMPTY_STATE, new FormData());

  assert.equal(result.ok, undefined);
  assert.equal(typeof result.error, "string");
});

void test("reopenApplication: already reopened is an idempotent no-op with no writes", async () => {
  const partner = buildPartnerRow({ status: "pending", submittedAt: null });
  const { db, updates, inserts } = trackedDb({ partner });
  setPartnerContext({ db, session: buildSession() });

  const result = await reopenApplication(EMPTY_STATE, new FormData());

  assert.deepEqual(result, { ok: true });
  assert.equal(updates.length, 0);
  assert.equal(inserts.length, 0);
});

void test("reopenApplication: a verified partner is refused", async () => {
  const partner = buildPartnerRow({ status: "verified", submittedAt: new Date("2025-01-01") });
  const { db, updates } = trackedDb({ partner });
  setPartnerContext({ db, session: buildSession() });

  const result = await reopenApplication(EMPTY_STATE, new FormData());

  assert.equal(result.ok, undefined);
  assert.equal(typeof result.error, "string");
  assert.equal(updates.length, 0);
});

void test("reopenApplication: a rejected, previously-submitted partner can reopen", async () => {
  const partner = buildPartnerRow({ status: "rejected", submittedAt: new Date("2025-01-01") });
  const { db, updates } = trackedDb({ partner });
  setPartnerContext({ db, session: buildSession() });

  const result = await reopenApplication(EMPTY_STATE, new FormData());

  assert.deepEqual(result, { ok: true });
  assert.equal(updates.length, 1);
  assert.equal(updates[0]?.values.submittedAt, null);
});

void test("reopenApplication: a failure inside the transaction returns a generic error", async () => {
  const { db } = trackedDb({ partner: buildPartnerRow(), transactionError: new Error("db down") });
  setPartnerContext({ db, session: buildSession() });

  const result = await reopenApplication(EMPTY_STATE, new FormData());

  assert.equal(result.ok, undefined);
  assert.equal(typeof result.error, "string");
});
