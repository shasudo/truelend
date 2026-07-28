import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { schema } from "@truelend/db";
import {
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
const { createUserAction, setRoleAction, setBanAction, removeUserAction } =
  await import("../lib/team-actions");

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

interface RecordedWrite {
  table: unknown;
  values: FakeRow;
}

void test("createUserAction: a non-admin session is refused (no trailing period, unlike the other actions)", async () => {
  setFakeAuthState({ getSession: async () => buildAdminSession({ role: "employee" }) });
  const formData = new FormData();
  formData.set("name", "New Teammate");
  formData.set("email", "new@example.com");
  formData.set("role", "employee");

  const result = await createUserAction({}, formData);

  assert.deepEqual(result, { error: "Not authorized" });
});

void test("createUserAction: a valid submission creates the account and sends an activation link", async () => {
  const inserts: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    createUser: async () => ({ user: { id: "new-user-1" } }),
    dbOptions: { onInsert: (table, values) => inserts.push({ table, values }) },
  });
  const formData = new FormData();
  formData.set("name", "New Teammate");
  formData.set("email", "new@example.com");
  formData.set("role", "employee");

  const result = await createUserAction({}, formData);

  assert.deepEqual(result, { ok: true, createdEmail: "new@example.com" });
  assert.equal(
    inserts.some((write) => write.table === schema.auditLog),
    true,
  );
});

void test("createUserAction: a failure after account creation removes the just-created account", async () => {
  const removeUserCalls: unknown[] = [];
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    createUser: async () => ({ user: { id: "new-user-1" } }),
    requestPasswordReset: async () => {
      throw new Error("email provider down");
    },
    removeUser: async (args: unknown) => {
      removeUserCalls.push(args);
    },
  });
  const formData = new FormData();
  formData.set("name", "New Teammate");
  formData.set("email", "new@example.com");
  formData.set("role", "employee");

  const result = await createUserAction({}, formData);

  assert.equal(result.ok, undefined);
  assert.equal(removeUserCalls.length, 1);
  assert.deepEqual((removeUserCalls[0] as { body: unknown }).body, { userId: "new-user-1" });
});

void test("setRoleAction: a valid role change is applied and audited", async () => {
  const inserts: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [
          schema.user,
          [{ id: "staff-2", email: "staff2@example.com", role: "employee", banned: false }],
        ],
      ]),
      onInsert: (table, values) => inserts.push({ table, values }),
    },
  });
  const formData = new FormData();
  formData.set("userId", "staff-2");
  formData.set("role", "admin");

  const result = await setRoleAction(formData);

  assert.deepEqual(result, { ok: true });
  assert.equal(inserts.length, 1);
});

void test("setBanAction: changing the access state calls banUser and audits it", async () => {
  const inserts: RecordedWrite[] = [];
  let banUserCalled = false;
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    banUser: async () => {
      banUserCalled = true;
      return { user: { banned: true } };
    },
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [
          schema.user,
          [{ id: "staff-2", email: "staff2@example.com", role: "employee", banned: false }],
        ],
      ]),
      onInsert: (table, values) => inserts.push({ table, values }),
    },
  });
  const formData = new FormData();
  formData.set("userId", "staff-2");
  formData.set("banned", "true");

  const result = await setBanAction(formData);

  assert.deepEqual(result, { ok: true, banned: true });
  assert.equal(banUserCalled, true);
  assert.equal(inserts.length, 1);
});

void test("setBanAction: requesting the already-current state is a no-op with no write", async () => {
  const inserts: RecordedWrite[] = [];
  let banUserCalled = false;
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    banUser: async () => {
      banUserCalled = true;
      return { user: { banned: true } };
    },
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [
          schema.user,
          [{ id: "staff-2", email: "staff2@example.com", role: "employee", banned: true }],
        ],
      ]),
      onInsert: (table, values) => inserts.push({ table, values }),
    },
  });
  const formData = new FormData();
  formData.set("userId", "staff-2");
  formData.set("banned", "true");

  const result = await setBanAction(formData);

  assert.deepEqual(result, { ok: true, banned: true });
  assert.equal(banUserCalled, false);
  assert.equal(inserts.length, 0);
});

void test("removeUserAction: a teammate with no retained history is removed", async () => {
  const inserts: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [
          schema.user,
          [{ id: "staff-2", email: "staff2@example.com", role: "employee", banned: false }],
        ],
        [schema.leadNotes, []],
        [schema.loanCases, []],
        [schema.partners, []],
      ]),
      onInsert: (table, values) => inserts.push({ table, values }),
    },
  });
  const formData = new FormData();
  formData.set("userId", "staff-2");

  const result = await removeUserAction(formData);

  assert.deepEqual(result, { ok: true });
  const auditEntry = inserts.find((write) => write.table === schema.auditLog);
  assert.equal(auditEntry?.values.after, undefined);
});

void test("removeUserAction: retained history (notes, cases, or partner reviews) blocks deletion", async () => {
  let removeUserCalled = false;
  setFakeAuthState({
    getSession: async () => buildAdminSession(),
    removeUser: async () => {
      removeUserCalled = true;
    },
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [
          schema.user,
          [{ id: "staff-2", email: "staff2@example.com", role: "employee", banned: false }],
        ],
        [schema.leadNotes, [{ id: "note-1" }]],
        [schema.loanCases, []],
        [schema.partners, []],
      ]),
    },
  });
  const formData = new FormData();
  formData.set("userId", "staff-2");

  const result = await removeUserAction(formData);

  assert.equal(result.ok, undefined);
  assert.equal(typeof result.error, "string");
  assert.equal(removeUserCalled, false);
});
