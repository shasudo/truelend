import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { schema } from "@truelend/db";
import {
  getLeadStatusNotificationCalls,
  getWaitUntilCalls,
  installAuthDependencyMocks,
  RedirectSignal,
  resetFakeAuthState,
  setFakeAuthState,
  type FakeAdminSession,
} from "./support/fake-auth-dependencies";
import { installNextCacheMock } from "./support/fake-next-cache";
import type { FakeRow, FakeRowProvider } from "@truelend/test-support";

installAuthDependencyMocks();
installNextCacheMock();
beforeEach(() => {
  resetFakeAuthState();
});
const { createLoanCaseAction, updateLoanCaseAction } = await import("../lib/loan-actions");

function buildStaffSession(overrides: Partial<FakeAdminSession["user"]> = {}): FakeAdminSession {
  return {
    user: {
      id: overrides.id ?? "staff-1",
      email: overrides.email ?? "staff@example.com",
      name: overrides.name ?? "Staff",
      role: overrides.role ?? "employee",
    },
  };
}

const LEAD_ID = "11111111-1111-4111-8111-111111111111";
const CASE_ID = "22222222-2222-4222-8222-222222222222";

interface RecordedWrite {
  table: unknown;
  values: FakeRow;
}

function buildCreateForm(overrides: Record<string, string> = {}): FormData {
  const formData = new FormData();
  formData.set("leadId", overrides.leadId ?? LEAD_ID);
  formData.set("lenderSlug", overrides.lenderSlug ?? "sbi");
  formData.set("productSlug", overrides.productSlug ?? "home-loan");
  formData.set("status", overrides.status ?? "logged_in");
  return formData;
}

function buildUpdateForm(overrides: Record<string, string> = {}): FormData {
  const formData = new FormData();
  formData.set("caseId", overrides.caseId ?? CASE_ID);
  formData.set("lenderSlug", overrides.lenderSlug ?? "sbi");
  formData.set("productSlug", overrides.productSlug ?? "home-loan");
  formData.set("status", overrides.status ?? "approved");
  return formData;
}

void test("createLoanCaseAction: no staff session redirects to /login", async () => {
  setFakeAuthState({ getSession: async () => null });

  await assert.rejects(
    () => createLoanCaseAction({}, buildCreateForm()),
    (error: unknown) => {
      assert.ok(error instanceof RedirectSignal);
      assert.equal(error.target, "/login");
      return true;
    },
  );
});

void test("createLoanCaseAction: a valid case is created and redirects to the new case", async () => {
  const inserts: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildStaffSession(),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [schema.leads, [{ id: LEAD_ID }]],
        [schema.loanCases, []],
      ]),
      onInsert: (table, values) => inserts.push({ table, values }),
      returningRows: () => [{ id: CASE_ID }],
    },
  });

  await assert.rejects(
    () => createLoanCaseAction({}, buildCreateForm()),
    (error: unknown) => {
      assert.ok(error instanceof RedirectSignal);
      assert.equal(error.target, `/loan-cases/${CASE_ID}`);
      return true;
    },
  );
  assert.equal(
    inserts.some((write) => write.table === schema.loanCases),
    true,
  );
});

void test("createLoanCaseAction: a missing lead is reported without inserting a case", async () => {
  const inserts: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildStaffSession(),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([[schema.leads, []]]),
      onInsert: (table, values) => inserts.push({ table, values }),
    },
  });

  const result = await createLoanCaseAction({}, buildCreateForm());

  assert.equal(result.ok, undefined);
  assert.equal(typeof result.error, "string");
  assert.equal(inserts.length, 0);
});

void test("updateLoanCaseAction: a valid update recomputes the lead and returns ok", async () => {
  setFakeAuthState({
    getSession: async () => buildStaffSession(),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [schema.loanCases, [{ id: CASE_ID, leadId: LEAD_ID, approvedAt: null }]],
        [schema.leads, [{ id: LEAD_ID }]],
      ]),
    },
  });

  const result = await updateLoanCaseAction({}, buildUpdateForm({ status: "approved" }));

  assert.deepEqual(result, { ok: true });
});

void test("updateLoanCaseAction: resubmitting an already-reached status does not overwrite its timestamp", async () => {
  const updates: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildStaffSession(),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [
          schema.loanCases,
          [{ id: CASE_ID, leadId: LEAD_ID, approvedAt: new Date("2025-01-01T00:00:00Z") }],
        ],
        [schema.leads, [{ id: LEAD_ID }]],
      ]),
      onUpdate: (table, values) => updates.push({ table, values }),
    },
  });

  const result = await updateLoanCaseAction({}, buildUpdateForm({ status: "approved" }));

  assert.deepEqual(result, { ok: true });
  const caseUpdate = updates.find((write) => write.table === schema.loanCases);
  assert.equal(caseUpdate?.values.approvedAt, undefined);
});

void test("updateLoanCaseAction: a case-driven lead move is audited and notified", async () => {
  const inserts: RecordedWrite[] = [];
  let leadReads = 0;
  setFakeAuthState({
    getSession: async () => buildStaffSession(),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[] | FakeRowProvider>([
        [
          schema.loanCases,
          [{ id: CASE_ID, leadId: LEAD_ID, disbursedAt: null, status: "disbursed" }],
        ],
        [
          schema.leads,
          () => {
            leadReads += 1;
            return [{ id: LEAD_ID, status: "approved", email: "applicant@example.com" }];
          },
        ],
      ]),
      onInsert: (table, values) => inserts.push({ table, values }),
    },
  });

  const result = await updateLoanCaseAction({}, buildUpdateForm({ status: "disbursed" }));

  assert.deepEqual(result, { ok: true });
  const recompute = inserts.find(
    (write) => write.table === schema.auditLog && write.values.action === "lead.status_recompute",
  );
  assert.ok(recompute, "a case-driven lead status change leaves an audit trail");
  assert.deepEqual(recompute.values.after, { status: "disbursed", from: "loan_case" });
  // The point of the fix: a disbursal used to reach nobody, because the pipeline
  // form refuses a status a loan case controls, so this was the only writer and
  // it sent nothing. Assert the mail itself, not the read count.
  await Promise.all(getWaitUntilCalls());
  assert.deepEqual(getLeadStatusNotificationCalls(), [
    {
      to: "applicant@example.com",
      name: undefined,
      status: "disbursed",
      idempotencyKey: `lead_status:${LEAD_ID}:disbursed`,
    },
  ]);
  assert.ok(leadReads >= 2, "the notification targets are looked up after the transaction");
});

void test("updateLoanCaseAction: a recompute to the same status writes no audit row and notifies nobody", async () => {
  const inserts: RecordedWrite[] = [];
  let leadReads = 0;
  setFakeAuthState({
    getSession: async () => buildStaffSession(),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[] | FakeRowProvider>([
        [
          schema.loanCases,
          [{ id: CASE_ID, leadId: LEAD_ID, approvedAt: new Date(), status: "approved" }],
        ],
        [
          schema.leads,
          () => {
            leadReads += 1;
            return [{ id: LEAD_ID, status: "approved", email: "applicant@example.com" }];
          },
        ],
      ]),
      onInsert: (table, values) => inserts.push({ table, values }),
    },
  });

  const result = await updateLoanCaseAction({}, buildUpdateForm({ status: "approved" }));

  assert.deepEqual(result, { ok: true });
  assert.equal(
    inserts.some((write) => write.values.action === "lead.status_recompute"),
    false,
  );
  await Promise.all(getWaitUntilCalls());
  assert.deepEqual(getLeadStatusNotificationCalls(), [], "an unchanged status mails nobody");
  assert.equal(leadReads, 1, "an unchanged status must not trigger the notification lookup");
});
