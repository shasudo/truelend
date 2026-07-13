import fs from "node:fs";

const app = process.argv[2];
const secretListPath = process.argv[3];
if (!app || !secretListPath) {
  throw new Error("Usage: assert-production-config.mjs <app> <wrangler-secret-list.json>");
}

const secretList = JSON.parse(fs.readFileSync(secretListPath, "utf8"));
const names = new Set(
  (Array.isArray(secretList) ? secretList : (secretList.secrets ?? [])).map((entry) =>
    typeof entry === "string" ? entry : entry.name,
  ),
);
const requiredSecrets = {
  website: ["TURNSTILE_SECRET_KEY", "HEALTHCHECK_SECRET"],
  admin: ["BETTER_AUTH_SECRET", "HEALTHCHECK_SECRET"],
  partners: ["BETTER_AUTH_SECRET", "TURNSTILE_SECRET_KEY", "HEALTHCHECK_SECRET"],
};

const expected = requiredSecrets[app];
if (!expected) throw new Error(`Unknown app: ${app}`);
const missing = expected.filter((name) => !names.has(name));
if (missing.length > 0) {
  throw new Error(`${app} Worker is missing required secret(s): ${missing.join(", ")}`);
}

if (
  (app === "website" || app === "partners") &&
  !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()
) {
  throw new Error(`NEXT_PUBLIC_TURNSTILE_SITE_KEY is required for the ${app} production build`);
}
if (!process.env.HEALTHCHECK_SECRET?.trim()) {
  throw new Error("HEALTHCHECK_SECRET must also exist in the protected GitHub environment");
}

console.log(`✓ ${app} production configuration is present`);
