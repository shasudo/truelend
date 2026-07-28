import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import {
  installAuthDependencyMocks,
  resetFakeAuthState,
  setFakeAuthState,
} from "./support/fake-auth-dependencies";

installAuthDependencyMocks();
beforeEach(() => {
  resetFakeAuthState();
});
const { GET } = await import("../app/api/health/ready/route");

function buildEnv(overrides: { HEALTHCHECK_SECRET?: string } = {}) {
  return {
    HYPERDRIVE: { connectionString: "postgres://fake" },
    BETTER_AUTH_SECRET: "secret",
    BETTER_AUTH_URL: "https://admin.example.com",
    HEALTHCHECK_SECRET: overrides.HEALTHCHECK_SECRET,
  };
}

void test("health/ready: a wrong bearer token returns 401 when a secret IS configured", async () => {
  setFakeAuthState({ env: buildEnv({ HEALTHCHECK_SECRET: "the-real-secret" }) });

  const response = await GET(
    new Request("https://admin.example.com/api/health/ready", {
      headers: { authorization: "Bearer wrong" },
    }),
  );

  assert.equal(response.status, 401);
});

void test("health/ready: an unconfigured secret fails closed with 503, not 401", async () => {
  setFakeAuthState({ env: buildEnv({ HEALTHCHECK_SECRET: undefined }) });

  const response = await GET(new Request("https://admin.example.com/api/health/ready"));

  assert.equal(response.status, 503);
});

void test("health/ready: a correct token with a healthy db and configured auth returns 200", async () => {
  setFakeAuthState({ env: buildEnv({ HEALTHCHECK_SECRET: "the-real-secret" }) });

  const response = await GET(
    new Request("https://admin.example.com/api/health/ready", {
      headers: { authorization: "Bearer the-real-secret" },
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, "ok");
  assert.equal(body.db, "ok");
  assert.equal(body.auth, "ok");
});
