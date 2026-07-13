import { randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const secret = () => randomBytes(32).toString("base64url");
const turnstileSiteKey = "1x00000000000000000000AA";
const turnstileSecretKey = "1x0000000000000000000000000000000AA";
const databaseUrl = "postgres://postgres:postgres@localhost:5432/truelend";
let migrated = 0;

for (const app of ["website", "admin", "partners"]) {
  const legacy = resolve(root, `apps/${app}/.env`);
  const developmentOnly = resolve(root, `apps/${app}/.env.development.local`);
  if (existsSync(legacy) && !existsSync(developmentOnly)) {
    renameSync(legacy, developmentOnly);
    chmodSync(developmentOnly, 0o600);
    console.log(`migrated apps/${app}/.env to .env.development.local`);
    migrated += 1;
  } else if (existsSync(legacy)) {
    console.warn(
      `kept apps/${app}/.env because .env.development.local already exists; merge it manually before a production build`,
    );
  }
}

for (const app of ["website", "admin", "partners"]) {
  const nextEnv = resolve(root, `apps/${app}/.env.development.local`);
  if (!existsSync(nextEnv)) continue;
  const lines = readFileSync(nextEnv, "utf8").split(/\r?\n/);
  const overrides = lines.filter((line) =>
    /^\s*CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_[A-Z0-9_]+\s*=/.test(line),
  );
  if (overrides.length === 0) continue;

  const devVars = resolve(root, `apps/${app}/.dev.vars`);
  const existing = existsSync(devVars) ? readFileSync(devVars, "utf8") : "";
  const existingNames = new Set(
    existing
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=/)?.[1])
      .filter(Boolean),
  );
  const additions = overrides.filter((line) => {
    const name = line.match(/^\s*([A-Z0-9_]+)\s*=/)?.[1];
    return name && !existingNames.has(name);
  });
  const nextDevVars = [existing.trimEnd(), ...additions].filter(Boolean).join("\n") + "\n";
  writeFileSync(devVars, nextDevVars, { encoding: "utf8", mode: 0o600 });
  chmodSync(devVars, 0o600);
  writeFileSync(nextEnv, lines.filter((line) => !overrides.includes(line)).join("\n"), {
    encoding: "utf8",
    mode: 0o600,
  });
  chmodSync(nextEnv, 0o600);
  console.log(`moved ${app} Hyperdrive override from Next env to .dev.vars`);
  migrated += 1;
}

const files = new Map([
  [
    "packages/db/.env",
    `# Local migrations only. Never replace this with a production URL.\nDATABASE_URL=${databaseUrl}\n`,
  ],
  [
    "apps/website/.dev.vars",
    `TURNSTILE_SECRET_KEY=${turnstileSecretKey}\nHEALTHCHECK_SECRET=${secret()}\nRESEND_API_KEY=\nCLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE=${databaseUrl}\n`,
  ],
  [
    "apps/website/.env.development.local",
    `NEXT_PUBLIC_TURNSTILE_SITE_KEY=${turnstileSiteKey}\nNEXT_PUBLIC_CF_BEACON_TOKEN=\n`,
  ],
  [
    "apps/admin/.dev.vars",
    `BETTER_AUTH_SECRET=${secret()}\nBETTER_AUTH_URL=http://localhost:3001\nHEALTHCHECK_SECRET=${secret()}\nRESEND_API_KEY=\nCLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE=${databaseUrl}\n`,
  ],
  [
    "apps/partners/.dev.vars",
    `BETTER_AUTH_SECRET=${secret()}\nBETTER_AUTH_URL=http://localhost:3002\nTURNSTILE_SECRET_KEY=${turnstileSecretKey}\nHEALTHCHECK_SECRET=${secret()}\nRESEND_API_KEY=\nCLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE=${databaseUrl}\n`,
  ],
  ["apps/partners/.env.development.local", `NEXT_PUBLIC_TURNSTILE_SITE_KEY=${turnstileSiteKey}\n`],
  [
    "apps/admin/.env.development.local",
    "# Admin has no browser-visible local variables. Hyperdrive is in .dev.vars.\n",
  ],
]);

let created = 0;
for (const [relativePath, contents] of files) {
  const file = resolve(root, relativePath);
  if (existsSync(file)) {
    chmodSync(file, 0o600);
    console.log(`kept ${relativePath}`);
    continue;
  }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, contents, { encoding: "utf8", mode: 0o600 });
  chmodSync(file, 0o600);
  console.log(`created ${relativePath}`);
  created += 1;
}

console.log(
  created === 0 && migrated === 0
    ? "Local configuration was already present; nothing was overwritten."
    : `Created ${created} and migrated ${migrated} local-only configuration file(s).`,
);
console.log("Next: start a local Postgres database named truelend, then run pnpm db:migrate.");
