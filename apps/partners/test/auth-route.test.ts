import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import {
  getWaitUntilCalls,
  installAuthDependencyMocks,
  resetFakeAuthState,
  setFakeAuthState,
} from "./support/fake-auth-dependencies";

installAuthDependencyMocks();
beforeEach(() => {
  resetFakeAuthState();
});
const { GET } = await import("../app/api/auth/[...all]/route");

function buildEnv(options: { rateLimited?: boolean } = {}) {
  return {
    HYPERDRIVE: { connectionString: "postgres://fake" },
    BETTER_AUTH_SECRET: "secret",
    BETTER_AUTH_URL: "https://partners.example.com",
    AUTH_RATE_LIMITER: { limit: async () => ({ success: !options.rateLimited }) },
  };
}

void test("auth route: a blocked path (raw signup) 404s before any db/auth construction", async () => {
  setFakeAuthState({ env: buildEnv() });

  const response = await GET(new Request("https://partners.example.com/api/auth/sign-up/email"));

  assert.equal(response.status, 404);
});

void test("auth route: a rate-limited sensitive path returns 429", async () => {
  setFakeAuthState({ env: buildEnv({ rateLimited: true }) });

  const response = await GET(new Request("https://partners.example.com/api/auth/sign-in/email"));

  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "60");
});

void test("auth route: an allowed request delegates to better-auth's handler verbatim", async () => {
  setFakeAuthState({
    env: buildEnv(),
    authHandler: async () => Response.json({ session: "ok" }, { status: 200 }),
  });

  const response = await GET(new Request("https://partners.example.com/api/auth/get-session"));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { session: "ok" });
});

void test("auth route: a handler failure still schedules cleanup before propagating", async () => {
  setFakeAuthState({
    env: buildEnv(),
    authHandler: async () => {
      throw new Error("better-auth internal error");
    },
  });

  await assert.rejects(
    () => GET(new Request("https://partners.example.com/api/auth/get-session")),
    /better-auth internal error/,
  );
  assert.equal(getWaitUntilCalls().length > 0, true);
});
