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
    BETTER_AUTH_URL: "https://partners.example.com",
    TURNSTILE_SECRET_KEY: "secret",
    TURNSTILE_SITE_KEY: "site-key",
    HEALTHCHECK_SECRET: overrides.HEALTHCHECK_SECRET,
  };
}

void test("health/ready: a wrong bearer token returns 401 when a secret IS configured", async () => {
  setFakeAuthState({ env: buildEnv({ HEALTHCHECK_SECRET: "the-real-secret" }) });

  const response = await GET(
    new Request("https://partners.example.com/api/health/ready", {
      headers: { authorization: "Bearer wrong" },
    }),
  );

  assert.equal(response.status, 401);
});

void test("health/ready: an unconfigured secret fails closed with 503, not 401", async () => {
  setFakeAuthState({ env: buildEnv({ HEALTHCHECK_SECRET: undefined }) });

  const response = await GET(new Request("https://partners.example.com/api/health/ready"));

  assert.equal(response.status, 503);
});

void test("health/ready: a correct token with everything healthy returns 200", async () => {
  setFakeAuthState({ env: buildEnv({ HEALTHCHECK_SECRET: "the-real-secret" }) });

  const response = await GET(
    new Request("https://partners.example.com/api/health/ready", {
      headers: { authorization: "Bearer the-real-secret" },
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, "ok");
  assert.equal(body.db, "ok");
  assert.equal(body.registration, "ok");
  assert.equal(body.auth, "ok");
  assert.equal(body.turnstile, "ok");
});

void test("health/ready: a registration-schema check failure fails overall status while the db check still passes", async () => {
  setFakeAuthState({
    env: buildEnv({ HEALTHCHECK_SECRET: "the-real-secret" }),
    pingRegistrationError: new Error("registration table missing"),
  });

  const response = await GET(
    new Request("https://partners.example.com/api/health/ready", {
      headers: { authorization: "Bearer the-real-secret" },
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.db, "ok");
  assert.equal(body.registration, "error");
});
