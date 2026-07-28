import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { schema } from "@truelend/db";
import {
  installAuthDependencyMocks,
  RedirectSignal,
  resetFakeAuthState,
  setFakeAuthState,
  type FakePartnerSession,
} from "./support/fake-auth-dependencies";
import type { FakeRow } from "@truelend/test-support";

installAuthDependencyMocks();
beforeEach(() => {
  resetFakeAuthState();
});
const { registerPartner } = await import("../lib/signup-actions");

function buildSession(overrides: Partial<FakePartnerSession["user"]> = {}): FakePartnerSession {
  return {
    user: {
      id: overrides.id ?? "user-1",
      email: overrides.email ?? "partner@example.com",
      name: overrides.name ?? "Partner",
    },
  };
}

function buildEnv(options: { rateLimited?: boolean } = {}) {
  return {
    HYPERDRIVE: { connectionString: "postgres://fake" },
    BETTER_AUTH_SECRET: "secret",
    BETTER_AUTH_URL: "https://partners.example.com",
    REGISTRATION_RATE_LIMITER: { limit: async () => ({ success: !options.rateLimited }) },
  };
}

function buildProfileForm(overrides: Record<string, string> = {}): FormData {
  const formData = new FormData();
  formData.set("name", overrides.name ?? "New Partner");
  formData.set("dateOfBirth", "1990-01-01");
  formData.set("referralType", "financial_advisor");
  formData.set("city", "Mumbai");
  formData.set("pan", "");
  formData.set("phone", "9876543210");
  return formData;
}

function buildRegisterForm(overrides: Record<string, string> = {}): FormData {
  const formData = buildProfileForm(overrides);
  formData.set("email", overrides.email ?? "new@example.com");
  formData.set("password", "password1234");
  return formData;
}

interface RecordedWrite {
  table: unknown;
  values: FakeRow;
}

void test("registerPartner: a context construction failure returns service_unavailable", async () => {
  // createPartnerActionContext calls createAuthContext, which throws when
  // createPartnerAuth throws — the same lever lib/auth.ts's own tests use.
  setFakeAuthState({ createPartnerAuthError: new Error("construction failed") });

  const result = await registerPartner({}, buildRegisterForm());

  assert.equal(result.code, "service_unavailable");
  assert.equal(result.step, 3);
});

void test("registerPartner: invalid input returns invalid_input with the offending step", async () => {
  setFakeAuthState({ getSession: async () => null });

  const result = await registerPartner({}, buildRegisterForm({ name: "" }));

  assert.equal(result.code, "invalid_input");
});

void test("registerPartner: a rate-limited request is refused", async () => {
  setFakeAuthState({ getSession: async () => null, env: buildEnv({ rateLimited: true }) });

  const result = await registerPartner({}, buildRegisterForm());

  assert.equal(result.code, "rate_limited");
  assert.equal(result.step, 3);
});

void test("registerPartner: a valid anonymous registration creates the profile and redirects", async () => {
  const updates: RecordedWrite[] = [];
  const inserts: RecordedWrite[] = [];
  setFakeAuthState({
    getSession: async () => null,
    env: buildEnv(),
    signUpEmail: async () => ({ user: { id: "new-user-1" } }),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [schema.user, [{ email: "new@example.com", role: null }]],
        [schema.partners, []],
      ]),
      onUpdate: (table, values) => updates.push({ table, values }),
      onInsert: (table, values) => inserts.push({ table, values }),
      returningRows: () => [{ referenceId: "RP000001" }],
    },
  });

  await assert.rejects(
    () => registerPartner({}, buildRegisterForm()),
    (error: unknown) => {
      assert.ok(error instanceof RedirectSignal);
      assert.equal(error.target, "/dashboard");
      return true;
    },
  );
  assert.equal(
    inserts.some((write) => write.table === schema.partners),
    true,
  );
  assert.equal(
    updates.some((write) => write.table === schema.user && write.values.role === "referral"),
    true,
  );
});

void test("registerPartner: a signed-in user completing their profile does not call signUpEmail", async () => {
  let signUpEmailCalled = false;
  setFakeAuthState({
    getSession: async () => buildSession({ id: "user-1", email: "existing@example.com" }),
    env: buildEnv(),
    signUpEmail: async () => {
      signUpEmailCalled = true;
      return { user: { id: "should-not-be-used" } };
    },
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [schema.user, [{ email: "existing@example.com", role: null }]],
        [schema.partners, []],
      ]),
      returningRows: () => [{ referenceId: "RP000002" }],
    },
  });

  await assert.rejects(() => registerPartner({}, buildProfileForm()));
  assert.equal(signUpEmailCalled, false);
});

void test("registerPartner: an ineligible account with a session returns account_conflict, not a throw", async () => {
  setFakeAuthState({
    getSession: async () => buildSession(),
    env: buildEnv(),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [schema.user, [{ email: "partner@example.com", role: "admin" }]],
        [schema.partners, []],
      ]),
    },
  });

  const result = await registerPartner({}, buildProfileForm());

  assert.equal(result.code, "account_conflict");
  assert.equal(result.step, 3);
});

void test("registerPartner: an ineligible brand-new account is rolled back by deleting the just-created user", async () => {
  const deletedTables: unknown[] = [];
  setFakeAuthState({
    getSession: async () => null,
    env: buildEnv(),
    signUpEmail: async () => ({ user: { id: "new-user-1" } }),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [schema.user, [{ email: "new@example.com", role: "admin" }]],
        [schema.partners, []],
      ]),
      onDelete: (table) => deletedTables.push(table),
    },
  });

  const result = await registerPartner({}, buildRegisterForm());

  assert.equal(result.code, "registration_failed");
  assert.deepEqual(deletedTables, [schema.user]);
});

void test("registerPartner: a signed-in user who already has a partner profile falls through to the same redirect as a fresh registration", async () => {
  setFakeAuthState({
    getSession: async () => buildSession(),
    env: buildEnv(),
    dbOptions: {
      rowsByTable: new Map<unknown, FakeRow[]>([
        [schema.user, [{ email: "partner@example.com", role: "referral" }]],
        [schema.partners, [{ userId: "user-1" }]],
      ]),
    },
  });

  await assert.rejects(
    () => registerPartner({}, buildProfileForm()),
    (error: unknown) => {
      assert.ok(error instanceof RedirectSignal);
      assert.equal(error.target, "/dashboard");
      return true;
    },
  );
});
