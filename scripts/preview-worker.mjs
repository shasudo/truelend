import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import {
  hyperdriveOverrideName,
  loadEnvironmentValue,
  loadHyperdriveDevOverride,
} from "./load-hyperdrive-dev-override.mjs";

const app = process.argv[2];
if (!new Set(["website", "admin", "partners"]).has(app)) {
  throw new Error("Usage: preview-worker.mjs <website|admin|partners>");
}

const appDirectory = resolve(import.meta.dirname, "..", "apps", app);
loadHyperdriveDevOverride({ path: resolve(appDirectory, ".dev.vars") });

if (app === "website") {
  loadEnvironmentValue({
    name: "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
    path: resolve(appDirectory, ".env.development.local"),
  });
  if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
    throw new Error(
      "Website preview requires NEXT_PUBLIC_TURNSTILE_SITE_KEY; run pnpm bootstrap:local or export it explicitly.",
    );
  }
}

const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function run(args) {
  const result = spawnSync(command, args, {
    cwd: appDirectory,
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Preview command failed with status ${String(result.status)}`);
  }
}

console.log(
  process.env[hyperdriveOverrideName]
    ? `Using the ${app} Hyperdrive override from local configuration.`
    : `Using the ${app} Wrangler Hyperdrive fallback connection.`,
);
run(["worker:build"]);
run(["exec", "opennextjs-cloudflare", "preview"]);
