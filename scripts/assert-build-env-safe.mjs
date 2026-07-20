import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const app = process.argv[2];
if (!app || !["website", "admin", "partners"].includes(app)) {
  throw new Error("Usage: assert-build-env-safe.mjs <website|admin|partners>");
}

const appDirectory = resolve(import.meta.dirname, `../apps/${app}`);
const nextEnvFiles = [
  ".env",
  ".env.local",
  ".env.production",
  ".env.production.local",
  ".env.development",
  ".env.development.local",
  ".env.test",
  ".env.test.local",
];
const unsafe = [];

for (const name of nextEnvFiles) {
  const file = resolve(appDirectory, name);
  if (!existsSync(file)) continue;
  const contents = readFileSync(file, "utf8");
  if (
    /postgres(?:ql)?:\/\//i.test(contents) ||
    /^\s*DATABASE_URL\s*=\s*\S+/im.test(contents) ||
    /^\s*CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_[A-Z0-9_]+\s*=\s*\S+/im.test(contents)
  ) {
    unsafe.push(name);
  }
}

if (unsafe.length > 0) {
  throw new Error(
    `${app} production build refused: ${unsafe.join(", ")} contains a database connection value that OpenNext can bundle. Move Hyperdrive overrides to .dev.vars and keep direct DATABASE_URL values only in packages/db/.env.`,
  );
}

console.log(`✓ ${app} Next environment files contain no database URL`);
