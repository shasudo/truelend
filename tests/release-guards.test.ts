import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function checkProductionConfig(app: "admin" | "partners" | "website", names: string[]) {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "truelend-config-test-"));
  const secretList = join(temporaryDirectory, "secrets.json");
  writeFileSync(secretList, JSON.stringify(names.map((name) => ({ name }))));
  const result = spawnSync(
    process.execPath,
    [join(repositoryRoot, "scripts/assert-production-config.mjs"), app, secretList],
    {
      cwd: repositoryRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        HEALTHCHECK_SECRET: "synthetic-healthcheck-secret",
        NEXT_PUBLIC_TURNSTILE_SITE_KEY: "0x4AAAAAADsynthetic-production-key",
      },
    },
  );
  rmSync(temporaryDirectory, { recursive: true, force: true });
  return result;
}

void test("production configuration requires delivery and host-specific Turnstile settings", () => {
  assert.equal(
    checkProductionConfig("website", [
      "TURNSTILE_SECRET_KEY",
      "HEALTHCHECK_SECRET",
      "RESEND_API_KEY",
    ]).status,
    0,
  );
  assert.equal(
    checkProductionConfig("partners", [
      "BETTER_AUTH_SECRET",
      "TURNSTILE_SECRET_KEY",
      "HEALTHCHECK_SECRET",
      "RESEND_API_KEY",
    ]).status,
    0,
  );
  const missingEmail = checkProductionConfig("admin", ["BETTER_AUTH_SECRET", "HEALTHCHECK_SECRET"]);
  assert.notEqual(missingEmail.status, 0);
  assert.match(missingEmail.stderr, /RESEND_API_KEY/);
});

void test("production deploy entrypoint refuses a developer workstation", () => {
  const script = join(repositoryRoot, "scripts/assert-production-deploy.mjs");
  const local = spawnSync(process.execPath, [script], {
    encoding: "utf8",
    env: { ...process.env, CI: "", GITHUB_ACTIONS: "" },
  });
  assert.notEqual(local.status, 0);
  assert.match(local.stderr, /release intent/);

  const genericGithubActionsContext = spawnSync(process.execPath, [script], {
    encoding: "utf8",
    env: { ...process.env, CI: "true", GITHUB_ACTIONS: "true" },
  });
  assert.notEqual(genericGithubActionsContext.status, 0);

  const releaseContext = spawnSync(process.execPath, [script], {
    encoding: "utf8",
    env: {
      ...process.env,
      CI: "true",
      GITHUB_ACTIONS: "true",
      GITHUB_REF: "refs/heads/main",
      TRUELEND_PRODUCTION_DEPLOY_APPROVED: "true",
    },
  });
  assert.equal(releaseContext.status, 0);
});
