import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import {
  getWaitUntilCalls,
  installAuthDependencyMocks,
  RedirectSignal,
  resetFakeAuthState,
  setFakeAuthState,
  type FakeAdminSession,
} from "./support/fake-auth-dependencies";

installAuthDependencyMocks();
beforeEach(() => {
  resetFakeAuthState();
});
const { authOptions, createAuthContext, getMutationContext, requireAdmin, requireStaff } =
  await import("../lib/auth");

function buildSession(overrides: Partial<FakeAdminSession["user"]> = {}): FakeAdminSession {
  return {
    user: {
      id: overrides.id ?? "staff-1",
      email: overrides.email ?? "staff@example.com",
      name: overrides.name ?? "Test Staff",
      role: overrides.role ?? "employee",
    },
  };
}

void test("requireStaff: no session redirects to /login", async () => {
  setFakeAuthState({ getSession: async () => null });

  await assert.rejects(
    () => requireStaff(),
    (error: unknown) => {
      assert.ok(error instanceof RedirectSignal);
      assert.equal(error.target, "/login");
      return true;
    },
  );
});

void test("requireAdmin: a staff session without admin role redirects to / (not /login)", async () => {
  setFakeAuthState({ getSession: async () => buildSession({ role: "employee" }) });

  await assert.rejects(
    () => requireAdmin(),
    (error: unknown) => {
      assert.ok(error instanceof RedirectSignal);
      assert.equal(error.target, "/");
      return true;
    },
  );
});

void test("requireAdmin: an admin session is returned without redirecting", async () => {
  setFakeAuthState({ getSession: async () => buildSession({ role: "admin" }) });

  const session = await requireAdmin();

  assert.equal(session.user.role, "admin");
});

void test("getMutationContext: no session resolves user:null without throwing or redirecting", async () => {
  setFakeAuthState({ getSession: async () => null });

  const context = await getMutationContext();

  assert.equal(context.user, null);
});

void test("getMutationContext: a staff session resolves the session's user", async () => {
  setFakeAuthState({ getSession: async () => buildSession({ role: "admin" }) });

  const context = await getMutationContext();

  assert.equal(context.user?.role, "admin");
});

void test("createAuthContext: a construction failure schedules cleanup and rethrows unchanged", () => {
  const failure = new Error("better-auth construction failed");
  setFakeAuthState({ createAdminAuthError: failure });

  assert.throws(
    () => createAuthContext(),
    (error: unknown) => error === failure,
  );
  assert.equal(getWaitUntilCalls().length > 0, true);
});

void test("authOptions().sendResetPassword: fails closed in production when email delivery is skipped", async () => {
  setFakeAuthState({ sendPasswordReset: async () => ({ ok: true, skipped: true }) });
  const options = authOptions({
    HYPERDRIVE: { connectionString: "postgres://fake" },
    BETTER_AUTH_SECRET: "secret",
    BETTER_AUTH_URL: "https://admin.example.com",
  } as unknown as Parameters<typeof authOptions>[0]);
  const sendResetPassword = options.sendResetPassword;
  assert.ok(sendResetPassword);

  await assert.rejects(
    () => sendResetPassword({ user: { email: "a@b.com", name: "A" }, url: "https://x/reset" }),
    /Password reset email was not accepted for delivery/,
  );
});
