import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";
import test, { beforeEach } from "node:test";
import { and, eq } from "drizzle-orm";
import { schema } from "@truelend/db";
import {
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
const OTHER_LEAD_ID = "22222222-2222-4222-8222-222222222222";

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

void test("updateLeadPipelineAction: reassigning without moving stage notifies nobody", async () => {
  let leadReads = 0;
  setFakeAuthState({
    // Reassignment is admin-only, so this behaviour is now exercised as one.
    getSession: async () => buildStaffSession({ role: "admin" }),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[] | FakeRowProvider>([
        [
          schema.leads,
          () => {
            leadReads += 1;
            return [{ status: "approved", assignedTo: null, email: "applicant@example.com" }];
          },
        ],
        [schema.loanCases, []],
        [schema.user, [{ id: "staff-2", email: "lead@example.com", name: "Lead" }]],
      ]),
    },
  });

  const result = await updateLeadPipelineAction(
    {},
    buildPipelineForm({ status: "approved", assignedTo: "staff-2" }),
  );

  assert.deepEqual(result, { ok: true });
  // The notification lookup is the only read of schema.leads outside the
  // transaction, so a single read proves nothing was queued.
  assert.equal(leadReads, 1, "an unchanged status must not trigger the notification lookup");
});

void test("updateLeadPipelineAction: an actual stage move does look up who to notify", async () => {
  let leadReads = 0;
  setFakeAuthState({
    getSession: async () => buildStaffSession(),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[] | FakeRowProvider>([
        [
          schema.leads,
          () => {
            leadReads += 1;
            return [{ status: "contacted", assignedTo: null, email: "applicant@example.com" }];
          },
        ],
        [schema.loanCases, []],
      ]),
    },
  });

  const result = await updateLeadPipelineAction({}, buildPipelineForm({ status: "approved" }));

  assert.deepEqual(result, { ok: true });
  assert.equal(leadReads, 2, "a real stage move must look up the notification targets");
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
    getSession: async () => buildStaffSession({ role: "admin" }),
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

void test("updateLeadPipelineAction: an employee cannot change the assignee", async () => {
  const updates: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildStaffSession(),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [schema.leads, [{ status: "new", assignedTo: null }]],
        [schema.loanCases, []],
        [schema.user, [{ id: "staff-2" }]],
      ]),
      onUpdate: (table, values) => updates.push({ table, values }),
    },
  });

  const result = await updateLeadPipelineAction({}, buildPipelineForm({ assignedTo: "staff-2" }));

  assert.equal(result.ok, undefined);
  assert.equal(typeof result.error, "string");
  assert.equal(updates.length, 0, "a refused assignment must not write the status either");
});

void test("updateLeadPipelineAction: an employee cannot touch a lead assigned to someone else", async () => {
  const updates: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildStaffSession(),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[] | FakeRowProvider>([
        [
          schema.leads,
          // Proves the scope reached SQL: the row is returned only when the
          // query carries both the id and this employee's own assignment.
          (query) =>
            isDeepStrictEqual(query.whereArgs, [
              and(eq(schema.leads.id, LEAD_ID), eq(schema.leads.assignedTo, "staff-1")),
            ])
              ? [{ status: "new", assignedTo: "staff-1" }]
              : [],
        ],
        [schema.loanCases, []],
      ]),
      onUpdate: (table, values) => updates.push({ table, values }),
    },
  });

  // The employee form renders no assignee control, so it posts none.
  const employeeForm = (leadId: string) => {
    const formData = new FormData();
    formData.set("leadId", leadId);
    formData.set("status", "qualified");
    return formData;
  };

  const mine = await updateLeadPipelineAction({}, employeeForm(LEAD_ID));
  assert.deepEqual(mine, { ok: true });

  // A lead that is not theirs never matches, so it reads as simply missing.
  const theirs = await updateLeadPipelineAction({}, employeeForm(OTHER_LEAD_ID));
  assert.equal(theirs.ok, undefined);
  assert.equal(typeof theirs.error, "string");
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
