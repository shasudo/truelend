import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  environmentValueFrom,
  hyperdriveOverrideFrom,
  hyperdriveOverrideName,
  loadHyperdriveDevOverride,
} from "../scripts/load-hyperdrive-dev-override.mjs";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));

void test("Hyperdrive local overrides preserve query-string equals signs", () => {
  const connection = "postgres://local.test/db?sslmode=require&options=a=b";
  assert.equal(hyperdriveOverrideFrom(`${hyperdriveOverrideName}=${connection}\n`), connection);
});

void test("local environment parsing supports browser-safe preview values", () => {
  assert.equal(
    environmentValueFrom(
      "NEXT_PUBLIC_TURNSTILE_SITE_KEY=site-key=value\n",
      "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
    ),
    "site-key=value",
  );
});

void test("an explicit process override wins over .dev.vars", () => {
  const env: Record<string, string | undefined> = { [hyperdriveOverrideName]: "existing" };
  loadHyperdriveDevOverride({ env, path: "/does/not/need/to/exist" });
  assert.equal(env[hyperdriveOverrideName], "existing");
});

void test("every Worker preview uses the local configuration bridge", () => {
  for (const app of ["admin", "partners", "website"]) {
    const manifest = JSON.parse(
      readFileSync(join(repositoryRoot, "apps", app, "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };
    assert.equal(manifest.scripts?.preview, `node ../../scripts/preview-worker.mjs ${app}`);
  }
});
