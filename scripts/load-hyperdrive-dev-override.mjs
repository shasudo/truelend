import { readFileSync } from "node:fs";

export const hyperdriveOverrideName = "CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE";

export function environmentValueFrom(contents, name) {
  const prefix = `${name}=`;
  const assignment = contents
    .split(/\r?\n/)
    .map((line) => line.trimStart())
    .find((line) => line.startsWith(prefix));
  return assignment?.slice(prefix.length).trim() || undefined;
}

export function hyperdriveOverrideFrom(contents) {
  return environmentValueFrom(contents, hyperdriveOverrideName);
}

function isMissingFile(error) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

// Wrangler reads this local override from process.env while the repository owns
// Worker-local values in .dev.vars. Bridge only this non-production config path.
export function loadEnvironmentValue({ env = process.env, name, path }) {
  if (env[name]) return;
  let contents;
  try {
    contents = readFileSync(path, "utf8");
  } catch (error) {
    if (isMissingFile(error)) return;
    throw error;
  }
  const value = environmentValueFrom(contents, name);
  if (value) env[name] = value;
}

export function loadHyperdriveDevOverride({ env = process.env, path = ".dev.vars" } = {}) {
  loadEnvironmentValue({ env, name: hyperdriveOverrideName, path });
}
