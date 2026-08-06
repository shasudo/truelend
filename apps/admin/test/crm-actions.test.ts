import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";
import test, { beforeEach } from "node:test";
import { and, eq, inArray, isNull, notInArray, or } from "drizzle-orm";
import { schema } from "@truelend/db";
import { terminalCallStatusValues } from "@truelend/reference";
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
  balanceCallQueueAction,
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

void test("updateCallTaskStatusAction: a closed non-converted task also refuses a further outcome", async () => {
  const updates: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildStaffSession(),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [schema.callTasks, [{ status: "wrong_number", callbackAt: null }]],
      ]),
      onUpdate: (table, values) => updates.push({ table, values }),
    },
  });

  const result = await updateCallTaskStatusAction({}, statusForm({ status: "interested" }));

  assert.equal(result.ok, undefined);
  assert.equal(typeof result.error, "string");
  assert.equal(updates.length, 0, "a closed task must not be reopened");
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
      rowsByTable: new Map<unknown, FakeRow[]>([
        [schema.user, [{ id: "staff-2" }]],
        [
          schema.callTasks,
          [
            { id: TASK_ID, status: "new", assignedTo: null },
            { id: OTHER_TASK_ID, status: "attempted", assignedTo: "staff-3" },
          ],
        ],
      ]),
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
  assert.equal(inserts.length, 1, "one multi-row insert, not one per task");
  const auditRows = inserts[0]?.values as unknown as {
    entityId: string;
    before: { assignedTo: string | null };
    after: { assignedTo: string | null };
  }[];
  assert.equal(
    auditRows.length,
    2,
    "one audit row per task, so it shows up in that task's history",
  );
  const mine = auditRows.find((r) => r.entityId === TASK_ID);
  const theirs = auditRows.find((r) => r.entityId === OTHER_TASK_ID);
  assert.ok(mine && theirs, "both selected tasks produced an audit row of their own");
  assert.equal(mine.before.assignedTo, null);
  assert.equal(mine.after.assignedTo, "staff-2");
  assert.equal(theirs.before.assignedTo, "staff-3", "the previous assignee is recorded, not lost");
  assert.equal(theirs.after.assignedTo, "staff-2");
});

void test("assignCallTasksAction: a closed task in the selection is skipped, not reassigned", async () => {
  const updates: RecordedWrite[] = [];
  const inserts: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildStaffSession({ role: "admin" }),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [schema.user, [{ id: "staff-2" }]],
        [
          schema.callTasks,
          [
            { id: TASK_ID, status: "new", assignedTo: null },
            { id: OTHER_TASK_ID, status: "converted", assignedTo: "staff-3" },
          ],
        ],
      ]),
      onUpdate: (table, values) => updates.push({ table, values }),
      onInsert: (table, values) => inserts.push({ table, values }),
    },
  });
  const formData = new FormData();
  formData.append("taskIds", TASK_ID);
  formData.append("taskIds", OTHER_TASK_ID);
  formData.set("assignedTo", "staff-2");

  const result = await assignCallTasksAction({}, formData);

  assert.equal(result.ok, true);
  assert.match(result.notice ?? "", /1 of 2/);
  assert.deepEqual(updates[0]?.values, { assignedTo: "staff-2" });
  const auditRows = inserts[0]?.values as unknown as { entityId: string }[];
  assert.deepEqual(
    auditRows.map((r) => r.entityId),
    [TASK_ID],
    "the closed task is neither reassigned nor audited",
  );
});

void test("assignCallTasksAction: an all-closed selection assigns nothing", async () => {
  const updates: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildStaffSession({ role: "admin" }),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [schema.user, [{ id: "staff-2" }]],
        [schema.callTasks, [{ id: TASK_ID, status: "not_interested", assignedTo: null }]],
      ]),
      onUpdate: (table, values) => updates.push({ table, values }),
    },
  });
  const formData = new FormData();
  formData.append("taskIds", TASK_ID);
  formData.set("assignedTo", "staff-2");

  const result = await assignCallTasksAction({}, formData);

  assert.equal(result.ok, undefined);
  assert.equal(typeof result.error, "string");
  assert.equal(updates.length, 0);
});

void test("assignCallTasksAction: a repeated id in the request does not inflate the audit count", async () => {
  const inserts: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildStaffSession({ role: "admin" }),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [schema.callTasks, [{ id: TASK_ID, status: "new", assignedTo: null }]],
      ]),
      onInsert: (table, values) => inserts.push({ table, values }),
    },
  });
  const formData = new FormData();
  formData.append("taskIds", TASK_ID);
  formData.append("taskIds", TASK_ID);
  formData.set("assignedTo", "");

  const result = await assignCallTasksAction({}, formData);

  assert.deepEqual(result, { ok: true });
  const auditRows = inserts[0]?.values as unknown as unknown[];
  assert.equal(auditRows.length, 1);
});

/* ---- balance the queue ---- */

function balanceForm(...employeeIds: string[]): FormData {
  const formData = new FormData();
  for (const id of employeeIds) formData.append("employeeIds", id);
  return formData;
}

/** The same form with a per-caller ceiling, which is what makes a move able to unassign. */
function cappedBalanceForm(max: number, ...employeeIds: string[]): FormData {
  const formData = balanceForm(...employeeIds);
  formData.set("maxPerEmployee", String(max));
  return formData;
}

/** Open queue rows the balance action's locking scan reads. */
function poolRows(rows: { id: string; status: string; assignedTo: string | null }[]): FakeRow[] {
  return rows as unknown as FakeRow[];
}

void test("balanceCallQueueAction: an employee is refused and nothing is written", async () => {
  const updates: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildStaffSession(),
    dbOptions: { onUpdate: (table, values) => updates.push({ table, values }) },
  });

  const result = await balanceCallQueueAction({}, balanceForm("staff-2"));

  assert.deepEqual(result, { error: "Not authorized." });
  assert.equal(updates.length, 0);
});

void test("balanceCallQueueAction: no callers selected is refused without writing", async () => {
  const updates: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildStaffSession({ role: "admin" }),
    dbOptions: { onUpdate: (table, values) => updates.push({ table, values }) },
  });

  const result = await balanceCallQueueAction({}, balanceForm());

  assert.equal(result.ok, undefined);
  assert.equal(typeof result.error, "string");
  assert.equal(updates.length, 0);
});

void test("balanceCallQueueAction: a caller who is no longer staff aborts the whole run", async () => {
  const updates: RecordedWrite[] = [];
  const inserts: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildStaffSession({ role: "admin" }),
    dbOptions: {
      // Two ids requested, one row back — the other was banned or demoted.
      rowsByTable: new Map<unknown, FakeRow[]>([[schema.user, [{ id: "staff-2" }]]]),
      onUpdate: (table, values) => updates.push({ table, values }),
      onInsert: (table, values) => inserts.push({ table, values }),
    },
  });

  const result = await balanceCallQueueAction({}, balanceForm("staff-2", "staff-3"));

  assert.equal(result.ok, undefined);
  assert.equal(typeof result.error, "string");
  assert.equal(updates.length, 0, "a partial split is never written");
  assert.equal(inserts.length, 0);
});

void test("balanceCallQueueAction: one UPDATE per receiving caller and one audit row per move", async () => {
  const updates: RecordedWrite[] = [];
  const inserts: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildStaffSession({ role: "admin" }),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [schema.user, [{ id: "staff-2" }, { id: "staff-3" }]],
        [
          schema.callTasks,
          poolRows([
            { id: "t1", status: "new", assignedTo: "staff-2" },
            { id: "t2", status: "new", assignedTo: "staff-2" },
            { id: "t3", status: "new", assignedTo: "staff-2" },
            { id: "t4", status: "new", assignedTo: null },
          ]),
        ],
      ]),
      onUpdate: (table, values) => updates.push({ table, values }),
      onInsert: (table, values) => inserts.push({ table, values }),
    },
  });

  const result = await balanceCallQueueAction({}, balanceForm("staff-2", "staff-3"));

  assert.equal(result.ok, true);
  assert.match(result.notice ?? "", /Moved 2 of 4/);
  assert.equal(
    updates.length,
    1,
    "one statement for the single receiving caller, not one per task",
  );
  assert.equal(updates[0]?.values.assignedTo, "staff-3");
  assert.equal(inserts.length, 1, "audit rows land in one chunked insert");
  const auditRows = inserts[0]?.values as unknown as {
    action: string;
    entityId: string;
    before: { assignedTo: string | null };
    after: { assignedTo: string | null };
  }[];
  assert.equal(auditRows.length, 2, "one row per moved task, so it shows in that task's history");
  assert.ok(auditRows.every((row) => row.action === "call_task.balance"));
  assert.ok(
    auditRows.every((row) => row.after.assignedTo === "staff-3"),
    "the audit records where each task landed",
  );
  // staff-2 was over their share by one and the fourth task was unassigned, so
  // the two rows must record different origins — that honesty is the whole
  // point of capturing `before`.
  assert.deepEqual(
    auditRows.map((row) => row.before.assignedTo).sort(),
    [null, "staff-2"],
    "the previous owner is preserved, and an unassigned task is not reported as taken from someone",
  );
});

void test("balanceCallQueueAction: an already-even queue reports it and writes nothing", async () => {
  const updates: RecordedWrite[] = [];
  const inserts: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildStaffSession({ role: "admin" }),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [schema.user, [{ id: "staff-2" }, { id: "staff-3" }]],
        [
          schema.callTasks,
          poolRows([
            { id: "t1", status: "new", assignedTo: "staff-2" },
            { id: "t2", status: "new", assignedTo: "staff-3" },
          ]),
        ],
      ]),
      onUpdate: (table, values) => updates.push({ table, values }),
      onInsert: (table, values) => inserts.push({ table, values }),
    },
  });

  const result = await balanceCallQueueAction({}, balanceForm("staff-2", "staff-3"));

  assert.equal(result.ok, true);
  assert.match(result.notice ?? "", /already within their share/);
  assert.equal(updates.length, 0);
  assert.equal(inserts.length, 0);
});

/*
 * The bug this pins: with every caller already over the cap there are no free
 * slots, so the shed tasks had nowhere to go and were handed straight back to
 * their owner. Zero moves, zero writes, and a notice claiming the queue was
 * already even while the cap had in fact done nothing at all.
 */
void test("balanceCallQueueAction: a cap unassigns what nobody is allowed to keep", async () => {
  const updates: { table: unknown; values: FakeRow }[] = [];
  const inserts: { table: unknown; values: FakeRow }[] = [];
  setFakeAuthState({
    getSession: async () => buildStaffSession({ role: "admin" }),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [schema.user, [{ id: "staff-2" }]],
        [
          schema.callTasks,
          poolRows(
            Array.from({ length: 5 }, (_, i) => ({
              id: `t${i}`,
              status: "new",
              assignedTo: "staff-2",
            })),
          ),
        ],
      ]),
      onUpdate: (table, values) => updates.push({ table, values }),
      onInsert: (table, values) => inserts.push({ table, values }),
    },
  });

  const result = await balanceCallQueueAction({}, cappedBalanceForm(2, "staff-2"));

  assert.equal(result.ok, true);
  assert.match(result.notice ?? "", /3 over the cap were unassigned/);
  assert.match(result.notice ?? "", /3 tasks are now unassigned/);
  const taskUpdates = updates.filter((write) => write.table === schema.callTasks);
  assert.equal(taskUpdates.length, 1, "one UPDATE, grouped by destination");
  assert.deepEqual(
    taskUpdates[0]?.values,
    { assignedTo: null } as unknown as FakeRow,
    "the excess was released to the pool, not moved to another caller",
  );
  const audits = inserts.filter((write) => write.table === schema.auditLog);
  assert.equal(audits.length, 1, "one chunked insert");
  const rows = audits[0]?.values as unknown as {
    action: string;
    before: { assignedTo: string | null };
    after: { assignedTo: string | null };
  }[];
  assert.equal(rows.length, 3, "one audit row per parked task");
  assert.ok(
    rows.every(
      (row) =>
        row.action === "call_task.balance" &&
        row.before.assignedTo === "staff-2" &&
        row.after.assignedTo === null,
    ),
    "the history must show where each task came from and that it is now unheld",
  );
});

/*
 * The pool is read unlocked, so a task can be reassigned or closed between that
 * read and the locks taken on the rows about to change. Such a task is dropped
 * from the run rather than failing it — one closed task must not cost the
 * operator every other move — but it is never dropped silently.
 */
void test("balanceCallQueueAction: a task that changed hands mid-run is skipped, not written", async () => {
  const updates: { table: unknown; values: FakeRow }[] = [];
  const inserts: { table: unknown; values: FakeRow }[] = [];
  const held = Array.from({ length: 5 }, (_, i) => ({
    id: `t${i}`,
    status: "new",
    assignedTo: "staff-2",
  }));
  setFakeAuthState({
    getSession: async () => buildStaffSession({ role: "admin" }),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[] | FakeRowProvider>([
        [schema.user, [{ id: "staff-2" }]],
        [
          schema.callTasks,
          // The unlocked pool read is the one carrying a limit; the locking
          // re-read is not. That is what tells the two apart here.
          (query) =>
            query.limitArgs.length > 0
              ? poolRows(held)
              : poolRows([
                  ...held.slice(0, 2),
                  // t2 is one of the three the cap parks — grabbed by another
                  // admin's bulk assign between the read and the lock.
                  { ...held[2]!, assignedTo: "staff-9" },
                  ...held.slice(3),
                ]),
        ],
      ]),
      onUpdate: (table, values) => updates.push({ table, values }),
      onInsert: (table, values) => inserts.push({ table, values }),
    },
  });

  const result = await balanceCallQueueAction({}, cappedBalanceForm(2, "staff-2"));

  assert.equal(result.ok, true);
  assert.match(result.notice ?? "", /1 task was reassigned or closed mid-run/);
  const audits = inserts.filter((write) => write.table === schema.auditLog);
  const rows = audits[0]?.values as unknown as { entityId: string }[];
  assert.equal(rows.length, 2, "only the two tasks still where we left them were written");
  assert.ok(
    rows.every((row) => row.entityId !== "t2"),
    "the task that changed hands must not get an audit row claiming we moved it",
  );
});

void test("balanceCallQueueAction: a queue past the cap is refused rather than half-balanced", async () => {
  const updates: RecordedWrite[] = [];
  const inserts: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildStaffSession({ role: "admin" }),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [schema.user, [{ id: "staff-2" }]],
        [
          schema.callTasks,
          // The action asks for MAX + 1 precisely so this case is detectable.
          poolRows(
            Array.from({ length: 20001 }, (_, i) => ({
              id: `t${i}`,
              status: "new",
              assignedTo: null,
            })),
          ),
        ],
      ]),
      onUpdate: (table, values) => updates.push({ table, values }),
      onInsert: (table, values) => inserts.push({ table, values }),
    },
  });

  const result = await balanceCallQueueAction({}, balanceForm("staff-2"));

  assert.equal(result.ok, undefined);
  assert.match(result.error ?? "", /20000/);
  assert.equal(updates.length, 0, "a partial balance is indistinguishable from a complete one");
  assert.equal(inserts.length, 0);
});

void test("balanceCallQueueAction: the pool clause excludes terminal tasks and other callers' books", async () => {
  let poolWhere: unknown;
  setFakeAuthState({
    getSession: async () => buildStaffSession({ role: "admin" }),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[] | FakeRowProvider>([
        [schema.user, [{ id: "staff-2" }]],
        [
          schema.callTasks,
          (query) => {
            poolWhere = query.whereArgs;
            return [];
          },
        ],
      ]),
    },
  });

  await balanceCallQueueAction({}, balanceForm("staff-2"));

  assert.ok(
    isDeepStrictEqual(poolWhere, [
      and(
        notInArray(schema.callTasks.status, [...terminalCallStatusValues]),
        or(isNull(schema.callTasks.assignedTo), inArray(schema.callTasks.assignedTo, ["staff-2"])),
      ),
    ]),
    "a widened pool clause would silently raid closed tasks or an unticked caller's book",
  );
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
