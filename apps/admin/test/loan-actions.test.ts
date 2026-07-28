import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { schema } from "@truelend/db";
import {
  installAuthDependencyMocks,
  RedirectSignal,
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
