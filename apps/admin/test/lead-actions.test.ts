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
const { updateLeadPipelineAction, addLeadNoteAction } = await import("../lib/lead-actions");

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

interface RecordedWrite {
  table: unknown;
  values: FakeRow;
}

function buildPipelineForm(overrides: Record<string, string> = {}): FormData {
  const formData = new FormData();
  formData.set("leadId", overrides.leadId ?? LEAD_ID);
  formData.set("status", overrides.status ?? "qualified");
  formData.set("assignedTo", overrides.assignedTo ?? "");
  return formData;
}

void test("updateLeadPipelineAction: no staff session redirects to /login", async () => {
  setFakeAuthState({ getSession: async () => null });

  await assert.rejects(
    () => updateLeadPipelineAction({}, buildPipelineForm()),
    (error: unknown) => {
      assert.ok(error instanceof RedirectSignal);
      assert.equal(error.target, "/login");
      return true;
    },
  );
});

void test("updateLeadPipelineAction: a fresh status update writes the lead and an audit row", async () => {
  const updates: RecordedWrite[] = [];
  const inserts: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildStaffSession(),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [schema.leads, [{ status: "new", assignedTo: null }]],
        [schema.loanCases, []],
      ]),
      onUpdate: (table, values) => updates.push({ table, values }),
      onInsert: (table, values) => inserts.push({ table, values }),
    },
  });

  const result = await updateLeadPipelineAction({}, buildPipelineForm({ status: "qualified" }));

  assert.deepEqual(result, { ok: true });
  assert.equal(updates.length, 1);
  assert.equal(updates[0]?.values.status, "qualified");
  assert.equal(inserts.length, 1);
});

void test("updateLeadPipelineAction: a missing lead is reported without writing", async () => {
  setFakeAuthState({
    getSession: async () => buildStaffSession(),
    dbOptions: { rowsByTable: new Map<unknown, FakeRow[]>([[schema.leads, []]]) },
  });

  const result = await updateLeadPipelineAction({}, buildPipelineForm());

  assert.equal(result.ok, undefined);
  assert.equal(typeof result.error, "string");
});

void test("updateLeadPipelineAction: assigning to a non-staff or banned user is rejected", async () => {
  setFakeAuthState({
    getSession: async () => buildStaffSession(),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [schema.leads, [{ status: "new", assignedTo: null }]],
        [schema.user, []],
      ]),
    },
  });

  const result = await updateLeadPipelineAction(
    {},
    buildPipelineForm({ assignedTo: "not-a-real-staff-id" }),
  );

  assert.equal(result.ok, undefined);
  assert.equal(typeof result.error, "string");
});

void test("updateLeadPipelineAction: a status conflicting with the loan case outcome is rejected without writing", async () => {
  const updates: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildStaffSession(),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [schema.leads, [{ status: "logged_in", assignedTo: null }]],
        [schema.loanCases, [{ status: "disbursed" }]],
      ]),
      onUpdate: (table, values) => updates.push({ table, values }),
    },
  });

  const result = await updateLeadPipelineAction({}, buildPipelineForm({ status: "contacted" }));

  assert.equal(result.ok, undefined);
  assert.equal(typeof result.error, "string");
  assert.equal(updates.length, 0);
});

void test("addLeadNoteAction: a valid note is inserted with an audit row", async () => {
  const inserts: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildStaffSession(),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([[schema.leads, [{ id: LEAD_ID }]]]),
      onInsert: (table, values) => inserts.push({ table, values }),
    },
  });
  const formData = new FormData();
  formData.set("leadId", LEAD_ID);
  formData.set("body", "Called the customer, will follow up tomorrow.");

  const result = await addLeadNoteAction({}, formData);

  assert.deepEqual(result, { ok: true });
  assert.equal(
    inserts.some((write) => write.table === schema.leadNotes),
    true,
  );
});
