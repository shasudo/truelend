import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { schema } from "@truelend/db";
import {
  getWaitUntilCalls,
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
const {
  authOptions,
  createPartnerActionContext,
  getOptionalPartnerSession,
  requirePartner,
  requirePartnerSession,
  withPartnerRequest,
} = await import("../lib/auth");

function buildSession(overrides: Partial<FakePartnerSession["user"]> = {}): FakePartnerSession {
  return {
    user: {
      id: overrides.id ?? "user-1",
      email: overrides.email ?? "partner@example.com",
      name: overrides.name ?? "Test Partner",
    },
  };
}

const PARTNER_ROW: FakeRow = { userId: "user-1", status: "verified" };

void test("requirePartnerSession: no session redirects to /login", async () => {
  setFakeAuthState({ getSession: async () => null, dbOptions: {} });

  await assert.rejects(
    () => requirePartnerSession(),
    (error: unknown) => {
      assert.ok(error instanceof RedirectSignal);
      assert.equal(error.target, "/login");
      return true;
    },
  );
});

void test("requirePartner: a session with no partner row redirects to /register/referral", async () => {
  setFakeAuthState({
    getSession: async () => buildSession(),
    dbOptions: { rowsByTable: new Map([[schema.partners, []]]) },
  });

  await assert.rejects(
    () => requirePartner(),
    (error: unknown) => {
      assert.ok(error instanceof RedirectSignal);
      assert.equal(error.target, "/register/referral");
      return true;
    },
  );
});

void test("requirePartnerSession: a session with a matching partner row returns both", async () => {
  setFakeAuthState({
    getSession: async () => buildSession(),
    dbOptions: { rowsByTable: new Map([[schema.partners, [PARTNER_ROW]]]) },
  });

  const result = await requirePartnerSession();

  assert.equal(result.session.user.id, "user-1");
  assert.equal(result.partner?.userId, "user-1");
});

void test("getOptionalPartnerSession: returns null without redirecting when there is no session", async () => {
  setFakeAuthState({ getSession: async () => null });

  const session = await getOptionalPartnerSession();

  assert.equal(session, null);
});

void test("createPartnerActionContext: a construction failure schedules cleanup and rethrows unchanged", () => {
  const failure = new Error("better-auth construction failed");
  setFakeAuthState({ createPartnerAuthError: failure });

  assert.throws(
    () => createPartnerActionContext(),
    (error: unknown) => error === failure,
  );
  assert.equal(getWaitUntilCalls().length > 0, true);
});

void test("authOptions().sendResetPassword: fails closed in production when email delivery is skipped", async () => {
  setFakeAuthState({ sendPasswordReset: async () => ({ ok: true, skipped: true }) });
  const options = authOptions({
    HYPERDRIVE: { connectionString: "postgres://fake" },
    BETTER_AUTH_SECRET: "secret",
    BETTER_AUTH_URL: "https://partners.example.com",
  } as unknown as Parameters<typeof authOptions>[0]);
  const sendResetPassword = options.sendResetPassword;
  assert.ok(sendResetPassword);

  await assert.rejects(
    () => sendResetPassword({ user: { email: "a@b.com", name: "A" }, url: "https://x/reset" }),
    /Password reset email was not accepted for delivery/,
  );
});

void test("withPartnerRequest: no session resolves partner as null without querying the database", async () => {
  setFakeAuthState({
    getSession: async () => null,
    dbOptions: { rowsByTable: new Map([[schema.partners, [PARTNER_ROW]]]) },
  });

  const result = await withPartnerRequest(new Headers(), async (context) => context);

  assert.equal(result.session, null);
  assert.equal(result.partner, null);
});
