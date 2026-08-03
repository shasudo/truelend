import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { schema } from "@truelend/db";
import { partnerDocumentTypeValues } from "@truelend/reference";
import {
  getNotifyPartnerDecisionCalls,
  installAuthDependencyMocks,
  resetFakeAuthState,
  setFakeAuthState,
  type FakeAdminSession,
} from "./support/fake-auth-dependencies";
import { installNextCacheMock } from "./support/fake-next-cache";
import type { FakeRow } from "@truelend/test-support";

installAuthDependencyMocks();
installNextCacheMock();
beforeEach(() => {
  resetFakeAuthState();
});
const {
  updatePartnerDetailsAction,
  approvePartnerAction,
  revokePartnerAction,
  rejectPartnerAction,
  recordPayoutAction,
} = await import("../lib/partner-actions");

function buildAdminSession(overrides: Partial<FakeAdminSession["user"]> = {}): FakeAdminSession {
  return {
    user: {
      id: overrides.id ?? "admin-1",
      email: overrides.email ?? "admin@example.com",
      name: overrides.name ?? "Admin",
      role: overrides.role ?? "admin",
    },
  };
}

const PARTNER_ID = "partner-1";

const COMPLETE_PARTNER_FIELDS = {
  pan: "ABCDE1234F",
  address: "123 Example Street",
  bankName: "Example Bank",
  accountHolder: "Test Partner",
  accountNumber: "123456789012",
  bankBranch: "Main Branch",
  ifsc: "HDFC0001234",
  nomineeName: "Nominee",
  nomineePhone: "9876543210",
  occupation: "Sales",
  designation: "Manager",
};

const ALL_DOC_TYPES = new Set(partnerDocumentTypeValues);

function buildDetailsForm(overrides: Record<string, string> = {}): FormData {
  const formData = new FormData();
  const fields: Record<string, string> = {
    partnerId: PARTNER_ID,
    phone: "",
    dateOfBirth: "",
    city: "",
    referralType: "",
    occupation: "",
    designation: "",
    experienceNote: "",
    pan: "",
    address: "",
    bankName: "",
    accountHolder: "",
    accountNumber: "",
    bankBranch: "",
    ifsc: "",
    nomineeName: "",
    nomineeAadhaar: "",
    nomineePhone: "",
    ...overrides,
  };
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

function buildIdForm(): FormData {
  const formData = new FormData();
  formData.set("partnerId", PARTNER_ID);
  return formData;
}

interface RecordedWrite {
  table: unknown;
  values: FakeRow;
}

void test("updatePartnerDetailsAction: a non-admin staff session is refused", async () => {
  setFakeAuthState({ getSession: async () => buildAdminSession({ role: "employee" }) });

  const result = await updatePartnerDetailsAction({}, buildDetailsForm());

  assert.deepEqual(result, { error: "Not authorized." });
});

void test("updatePartnerDetailsAction: changing a sensitive field on a verified partner resets it to pending review", async () => {
  const updates: RecordedWrite[] = [];
  const partner: FakeRow = {
    userId: PARTNER_ID,
    status: "verified",
    pan: null,
    address: null,
    bankName: null,
    accountHolder: null,
    accountNumber: null,
    bankBranch: null,
    ifsc: null,
    nomineeName: null,
    nomineeAadhaar: null,
    nomineePhone: null,
    occupation: null,
    designation: null,
  };
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([[schema.partners, [partner]]]),
      onUpdate: (table, values) => updates.push({ table, values }),
    },
  });

  const result = await updatePartnerDetailsAction({}, buildDetailsForm(COMPLETE_PARTNER_FIELDS));

  assert.deepEqual(result, { ok: true });
  assert.equal(updates[0]?.values.status, "pending");
  assert.equal(updates[0].values.verifiedBy, null);
});

void test("approvePartnerAction: an ineligible (incomplete) application is rejected", async () => {
  const partner: FakeRow = { userId: PARTNER_ID, status: "pending", submittedAt: new Date() };
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [schema.partners, [partner]],
        [schema.partnerDocuments, []],
      ]),
    },
  });

  const result = await approvePartnerAction({}, buildIdForm());

  assert.equal(result.ok, undefined);
  assert.equal(typeof result.error, "string");
});

void test("approvePartnerAction: a complete, awaiting-review application is approved", async () => {
  const updates: RecordedWrite[] = [];
  const partner: FakeRow = {
    userId: PARTNER_ID,
    status: "pending",
    submittedAt: new Date(),
    ...COMPLETE_PARTNER_FIELDS,
  };
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [schema.partners, [partner]],
        [schema.partnerDocuments, [...ALL_DOC_TYPES].map((docType) => ({ docType }))],
        [schema.user, []],
      ]),
      onUpdate: (table, values) => updates.push({ table, values }),
    },
  });

  const result = await approvePartnerAction({}, buildIdForm());

  assert.deepEqual(result, { ok: true });
  assert.equal(updates[0]?.values.status, "verified");
});

void test("revokePartnerAction: a verified partner is reverted to pending", async () => {
  const updates: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([[schema.partners, [{ status: "verified" }]]]),
      onUpdate: (table, values) => updates.push({ table, values }),
    },
  });

  const result = await revokePartnerAction({}, buildIdForm());

  assert.deepEqual(result, { ok: true });
  assert.equal(updates[0]?.values.status, "pending");
});

void test("revokePartnerAction: losing verification is told to the partner, like gaining it", async () => {
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [schema.partners, [{ status: "verified" }]],
        [schema.user, [{ email: "partner@example.com", name: "Synthetic Partner" }]],
      ]),
    },
  });

  const result = await revokePartnerAction({}, buildIdForm());

  assert.deepEqual(result, { ok: true });
  const [decision] = getNotifyPartnerDecisionCalls();
  assert.ok(decision);
  assert.equal(decision.decision, "revoked");
  assert.equal(decision.to, "partner@example.com");
});

void test("approvePartnerAction: a rejected notification is reported without claiming the approval failed", async () => {
  const updates: RecordedWrite[] = [];
  const partner: FakeRow = {
    userId: PARTNER_ID,
    status: "pending",
    submittedAt: new Date(),
    ...COMPLETE_PARTNER_FIELDS,
  };
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    notifyPartnerDecision: async () => ({ ok: false, error: "provider rejected" }),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [schema.partners, [partner]],
        [schema.partnerDocuments, [...ALL_DOC_TYPES].map((docType) => ({ docType }))],
        [schema.user, [{ email: "partner@example.com", name: "Synthetic Partner" }]],
      ]),
      onUpdate: (table, values) => updates.push({ table, values }),
    },
  });

  const result = await approvePartnerAction({}, buildIdForm());

  // The mutation committed, so this is a notice, never an error.
  assert.equal(result.ok, true);
  assert.equal(result.error, undefined);
  assert.match(result.notice ?? "", /not accepted for delivery/);
  assert.equal(updates[0]?.values.status, "verified");
});

void test("rejectPartnerAction: a pending, awaiting-review application is rejected with a reason", async () => {
  const updates: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [schema.partners, [{ status: "pending", submittedAt: new Date() }]],
        [schema.user, []],
      ]),
      onUpdate: (table, values) => updates.push({ table, values }),
    },
  });
  const formData = new FormData();
  formData.set("partnerId", PARTNER_ID);
  formData.set("reason", "Documents do not match the application.");

  const result = await rejectPartnerAction({}, formData);

  assert.deepEqual(result, { ok: true });
  assert.equal(updates[0]?.values.status, "rejected");
});

void test("recordPayoutAction: a valid payout is recorded", async () => {
  const inserts: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [schema.partners, [{ userId: PARTNER_ID }]],
        [schema.partnerPayouts, [{ earned: "0", paid: "0" }]],
      ]),
      onInsert: (table, values) => inserts.push({ table, values }),
      returningRows: () => [{ id: "payout-1" }],
    },
  });
  const formData = new FormData();
  formData.set("partnerId", PARTNER_ID);
  formData.set("kind", "earned");
  formData.set("amount", "500");

  const result = await recordPayoutAction({}, formData);

  assert.deepEqual(result, { ok: true });
  assert.equal(
    inserts.some((write) => write.table === schema.partnerPayouts),
    true,
  );
});

void test("recordPayoutAction: a corrupted ledger aggregate is rejected instead of recording on top of it", async () => {
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [schema.partners, [{ userId: PARTNER_ID }]],
        [schema.partnerPayouts, [{ earned: "not-a-number", paid: "0" }]],
      ]),
    },
  });
  const formData = new FormData();
  formData.set("partnerId", PARTNER_ID);
  formData.set("kind", "earned");
  formData.set("amount", "500");

  const result = await recordPayoutAction({}, formData);

  assert.equal(result.ok, undefined);
  assert.equal(typeof result.error, "string");
});

void test("recordPayoutAction: a payout exceeding the outstanding balance is rejected", async () => {
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [schema.partners, [{ userId: PARTNER_ID }]],
        [schema.partnerPayouts, [{ earned: "10000", paid: "0" }]],
      ]),
    },
  });
  const formData = new FormData();
  formData.set("partnerId", PARTNER_ID);
  formData.set("kind", "paid");
  formData.set("amount", "999999");

  const result = await recordPayoutAction({}, formData);

  assert.equal(result.ok, undefined);
  assert.equal(typeof result.error, "string");
});
