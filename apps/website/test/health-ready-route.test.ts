import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import {
  installWebsiteDependencyMocks,
  resetFakeWebsiteState,
  setFakeWebsiteState,
  type FakeCloudflareEnv,
} from "./support/fake-website-dependencies";

installWebsiteDependencyMocks();
beforeEach(() => {
  resetFakeWebsiteState();
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "site-key";
});
const { GET } = await import("../app/api/health/ready/route");

function buildEnv(overrides: Partial<FakeCloudflareEnv> = {}): FakeCloudflareEnv {
  return {
    HYPERDRIVE: { connectionString: "postgres://fake" },
    LEAD_RATE_LIMITER: { limit: async () => ({ success: true }) },
    TURNSTILE_SECRET_KEY: "secret",
    HEALTHCHECK_SECRET: undefined,
    ...overrides,
  };
}

void test("health/ready: a wrong bearer token returns 401 when a secret IS configured", async () => {
  setFakeWebsiteState({ env: buildEnv({ HEALTHCHECK_SECRET: "the-real-secret" }) });

  const response = await GET(
    new Request("https://example.com/api/health/ready", {
      headers: { authorization: "Bearer wrong" },
    }),
  );

  assert.equal(response.status, 401);
});

void test("health/ready: an unconfigured secret fails closed with 503, not 401", async () => {
  setFakeWebsiteState({ env: buildEnv({ HEALTHCHECK_SECRET: undefined }) });

  const response = await GET(new Request("https://example.com/api/health/ready"));

  assert.equal(response.status, 503);
});

void test("health/ready: a correct token with a healthy db and configured Turnstile returns 200", async () => {
  setFakeWebsiteState({ env: buildEnv({ HEALTHCHECK_SECRET: "the-real-secret" }) });

  const response = await GET(
    new Request("https://example.com/api/health/ready", {
      headers: { authorization: "Bearer the-real-secret" },
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, "ok");
  assert.equal(body.db, "ok");
  assert.equal(body.turnstile, "ok");
});
