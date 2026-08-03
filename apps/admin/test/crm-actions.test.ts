import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";
import test, { beforeEach } from "node:test";
import { and, eq } from "drizzle-orm";
import { schema } from "@truelend/db";
import {
  getSendEnquiryFormLinkCalls,
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
const {
  assignCallTasksAction,
  updateCallTaskStatusAction,
  convertCallTaskAction,
  emailEnquiryFormAction,
} = await import("../lib/crm-actions");

const TASK_ID = "33333333-3333-4333-8333-333333333333";
const OTHER_TASK_ID = "44444444-4444-4444-8444-444444444444";

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

const RATE_LIMIT_ENV = {
  HYPERDRIVE: { connectionString: "postgres://fake" },
  BETTER_AUTH_SECRET: "secret",
  BETTER_AUTH_URL: "https://admin.example.com",
  AUTH_RATE_LIMITER: { limit: async () => ({ success: true }) },
};

interface RecordedWrite {
  table: unknown;
  values: FakeRow;
}

function statusForm(overrides: Record<string, string> = {}): FormData {
  const formData = new FormData();
  formData.set("taskId", overrides.taskId ?? TASK_ID);
  formData.set("status", overrides.status ?? "attempted");
  if (overrides.callbackAt) formData.set("callbackAt", overrides.callbackAt);
  if (overrides.note) formData.set("note", overrides.note);
  return formData;
}

function convertForm(overrides: Record<string, string> = {}): FormData {
  const formData = new FormData();
  formData.set("taskId", overrides.taskId ?? TASK_ID);
  formData.set("name", overrides.name ?? "Anil Rao");
  formData.set("phone", overrides.phone ?? "9876543210");
  formData.set("consent", overrides.consent ?? "on");
  return formData;
}

void test("crm actions: no staff session redirects to /login", async () => {
  setFakeAuthState({ getSession: async () => null });

  await assert.rejects(
    () => updateCallTaskStatusAction({}, statusForm()),
    (error: unknown) => {
      assert.ok(error instanceof RedirectSignal);
      assert.equal(error.target, "/login");
      return true;
    },
  );
});

void test("updateCallTaskStatusAction: an employee cannot work someone else's task", async () => {
  const updates: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildStaffSession(),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[] | FakeRowProvider>([
        [
          schema.callTasks,
          // Proves the scope reached SQL: the row comes back only when the
          // query carries both the id and this employee's own assignment.
          (query) =>
            isDeepStrictEqual(query.whereArgs, [
              and(eq(schema.callTasks.id, TASK_ID), eq(schema.callTasks.assignedTo, "staff-1")),
            ])
              ? [{ status: "new", callbackAt: null }]
              : [],
        ],
      ]),
      onUpdate: (table, values) => updates.push({ table, values }),
    },
  });

  const mine = await updateCallTaskStatusAction({}, statusForm());
  assert.deepEqual(mine, { ok: true });

  const theirs = await updateCallTaskStatusAction({}, statusForm({ taskId: OTHER_TASK_ID }));
  assert.equal(theirs.ok, undefined);
  assert.equal(typeof theirs.error, "string");
  assert.equal(updates.length, 1, "only the caller's own task was written");
});

void test("updateCallTaskStatusAction: an outcome writes the task and an audit row", async () => {
  const updates: RecordedWrite[] = [];
  const inserts: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildStaffSession(),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [schema.callTasks, [{ status: "new", callbackAt: null }]],
      ]),
      onUpdate: (table, values) => updates.push({ table, values }),
      onInsert: (table, values) => inserts.push({ table, values }),
    },
  });

  const result = await updateCallTaskStatusAction(
    {},
    statusForm({ status: "not_interested", note: "Already borrowed elsewhere." }),
  );

  assert.deepEqual(result, { ok: true });
  assert.equal(updates[0]?.values.status, "not_interested");
  assert.equal(updates[0]!.values.callbackAt, null);
  assert.equal(inserts.length, 1, "the note rides the audit row, not a notes table");
});

void test("updateCallTaskStatusAction: a callback without a date is refused without writing", async () => {
  const updates: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildStaffSession(),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [schema.callTasks, [{ status: "new", callbackAt: null }]],
      ]),
      onUpdate: (table, values) => updates.push({ table, values }),
    },
  });

  const result = await updateCallTaskStatusAction({}, statusForm({ status: "callback_scheduled" }));

  assert.equal(result.ok, undefined);
  assert.equal(typeof result.error, "string");
  assert.equal(updates.length, 0);
});

void test("assignCallTasksAction: an employee is refused and nothing is written", async () => {
  const updates: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildStaffSession(),
    dbOptions: { onUpdate: (table, values) => updates.push({ table, values }) },
  });
  const formData = new FormData();
  formData.append("taskIds", TASK_ID);
  formData.set("assignedTo", "staff-2");

  const result = await assignCallTasksAction({}, formData);

  assert.deepEqual(result, { error: "Not authorized." });
  assert.equal(updates.length, 0);
});

void test("assignCallTasksAction: an admin assigns the selected tasks in one write", async () => {
  const updates: RecordedWrite[] = [];
  const inserts: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildStaffSession({ role: "admin" }),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([[schema.user, [{ id: "staff-2" }]]]),
      onUpdate: (table, values) => updates.push({ table, values }),
      onInsert: (table, values) => inserts.push({ table, values }),
    },
  });
  const formData = new FormData();
  formData.append("taskIds", TASK_ID);
  formData.append("taskIds", OTHER_TASK_ID);
  formData.set("assignedTo", "staff-2");

  const result = await assignCallTasksAction({}, formData);

  assert.deepEqual(result, { ok: true });
  assert.equal(updates.length, 1, "a bulk assignment is one statement, not one per task");
  assert.equal(updates[0]?.values.assignedTo, "staff-2");
  assert.equal(inserts.length, 1);
});

void test("convertCallTaskAction: a new prospect becomes a consented lead", async () => {
  const inserts: RecordedWrite[] = [];
  const updates: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildStaffSession(),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [
          schema.callTasks,
          [{ id: TASK_ID, status: "interested", leadId: null, assignedTo: "staff-1" }],
        ],
        // No existing lead carries this phone.
        [schema.leads, []],
      ]),
      returningRows: (table) => (table === schema.leads ? [{ id: "lead-1" }] : []),
      onInsert: (table, values) => inserts.push({ table, values }),
      onUpdate: (table, values) => updates.push({ table, values }),
    },
  });

  const result = await convertCallTaskAction({}, convertForm());

  assert.deepEqual(result, { ok: true });
  const leadWrite = inserts.find((write) => write.table === schema.leads);
  assert.ok(leadWrite, "a lead row is created");
  assert.equal(leadWrite.values.kind, "enquiry");
  assert.equal(leadWrite.values.consent, true);
  assert.equal(leadWrite.values.consentSource, "crm_call");
  assert.equal(leadWrite.values.assignedTo, "staff-1");
  assert.equal(updates[0]?.values.status, "converted");
  assert.equal(updates[0]!.values.leadId, "lead-1");
});

void test("convertCallTaskAction: a matching lead is linked instead of duplicated", async () => {
  const inserts: RecordedWrite[] = [];
  const updates: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildStaffSession(),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [
          schema.callTasks,
          [{ id: TASK_ID, status: "interested", leadId: null, assignedTo: "staff-1" }],
        ],
        // The prospect already filled the public form themselves.
        [schema.leads, [{ id: "existing-lead" }]],
      ]),
      onInsert: (table, values) => inserts.push({ table, values }),
      onUpdate: (table, values) => updates.push({ table, values }),
    },
  });

  const result = await convertCallTaskAction({}, convertForm());

  assert.equal(result.ok, true);
  assert.equal(
    inserts.some((write) => write.table === schema.leads),
    false,
    "linking must not create a second lead for the same person",
  );
  assert.equal(updates[0]?.values.leadId, "existing-lead");
  assert.equal(updates[0]!.values.status, "converted");
});

void test("emailEnquiryFormAction: a rejected send reports the failure and writes no audit row", async () => {
  const inserts: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildStaffSession(),
    env: RATE_LIMIT_ENV,
    sendEnquiryFormLink: async () => ({ ok: false, error: "rejected" }),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [schema.callTasks, [{ name: "Anil", email: "anil@example.com", productSlug: "home-loan" }]],
      ]),
      onInsert: (table, values) => inserts.push({ table, values }),
    },
  });
  const formData = new FormData();
  formData.set("taskId", TASK_ID);

  const result = await emailEnquiryFormAction({}, formData);

  assert.equal(result.ok, undefined);
  assert.equal(typeof result.error, "string");
  assert.equal(inserts.length, 0, "nothing is recorded as sent when the send failed");
});

void test("emailEnquiryFormAction: the link carries the task's product preselection", async () => {
  setFakeAuthState({
    getSession: async () => buildStaffSession(),
    env: RATE_LIMIT_ENV,
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [schema.callTasks, [{ name: "Anil", email: "anil@example.com", productSlug: "home-loan" }]],
      ]),
    },
  });
  const formData = new FormData();
  formData.set("taskId", TASK_ID);

  const result = await emailEnquiryFormAction({}, formData);

  assert.deepEqual(result, { ok: true });
  const [call] = getSendEnquiryFormLinkCalls();
  assert.equal(call?.to, "anil@example.com");
  assert.match(call!.url, /\/enquiry\?product=home-loan$/);
});

void test("emailEnquiryFormAction: a prospect with no email is told to copy the link", async () => {
  setFakeAuthState({
    getSession: async () => buildStaffSession(),
    env: RATE_LIMIT_ENV,
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [schema.callTasks, [{ name: "Anil", email: null, productSlug: null }]],
      ]),
    },
  });
  const formData = new FormData();
  formData.set("taskId", TASK_ID);

  const result = await emailEnquiryFormAction({}, formData);

  assert.equal(result.ok, undefined);
  assert.equal(getSendEnquiryFormLinkCalls().length, 0);
});

void test("convertCallTaskAction: the link target comes from the task, not the submitted phone", async () => {
  const inserts: RecordedWrite[] = [];
  const updates: RecordedWrite[] = [];
  let leadLookupPhone: unknown;
  setFakeAuthState({
    getSession: async () => buildStaffSession(),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[] | FakeRowProvider>([
        [
          schema.callTasks,
          [
            {
              id: TASK_ID,
              status: "interested",
              phone: "9000000001",
              leadId: null,
              assignedTo: "staff-1",
            },
          ],
        ],
        [
          schema.leads,
          (query) => {
            leadLookupPhone = query.whereArgs;
            // Only the number we actually dialled may match.
            return isDeepStrictEqual(query.whereArgs, [eq(schema.leads.phone, "9000000001")])
              ? []
              : [{ id: "someone-elses-lead" }];
          },
        ],
      ]),
      returningRows: (table) => (table === schema.leads ? [{ id: "lead-1" }] : []),
      onInsert: (table, values) => inserts.push({ table, values }),
      onUpdate: (table, values) => updates.push({ table, values }),
    },
  });

  // The caller edits the phone field to a number belonging to another customer.
  const result = await convertCallTaskAction({}, convertForm({ phone: "9876543210" }));

  assert.equal(result.ok, true);
  assert.ok(
    isDeepStrictEqual(leadLookupPhone, [eq(schema.leads.phone, "9000000001")]),
    "the existing-lead lookup must key on the task's stored phone",
  );
  // No match on the dialled number, so a fresh lead is created rather than the
  // task being pointed at a stranger's lead.
  assert.equal(updates[0]?.values.leadId, "lead-1");
  assert.equal(
    inserts.some((write) => write.table === schema.leads),
    true,
  );
});

void test("convertCallTaskAction: a closed task cannot be converted", async () => {
  const updates: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildStaffSession(),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [
          schema.callTasks,
          [
            {
              id: TASK_ID,
              status: "wrong_number",
              phone: "9000000001",
              leadId: null,
              assignedTo: "staff-1",
            },
          ],
        ],
      ]),
      onUpdate: (table, values) => updates.push({ table, values }),
    },
  });

  const result = await convertCallTaskAction({}, convertForm());

  assert.equal(result.ok, undefined);
  assert.equal(typeof result.error, "string");
  assert.equal(updates.length, 0);
});
