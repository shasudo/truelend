import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const dbRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const migrationRoot = join(dbRoot, "drizzle");
const temporaryRoot = mkdtempSync(join(dbRoot, ".drizzle-check-"));
const temporaryMigrations = join(temporaryRoot, "drizzle");

function directoryState(root: string): Map<string, string> {
  const state = new Map<string, string>();

  function visit(directory: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile()) {
        state.set(
          relative(root, path),
          createHash("sha256").update(readFileSync(path)).digest("hex"),
        );
      }
    }
  }

  visit(root);
  return state;
}

function changedPaths(before: Map<string, string>, after: Map<string, string>): string[] {
  return [...new Set([...before.keys(), ...after.keys()])]
    .filter((path) => before.get(path) !== after.get(path))
    .sort();
}

function assertTemporaryPath(path: string): void {
  const relativePath = relative(dbRoot, path);
  if (
    relativePath.startsWith(`..${sep}`) ||
    relativePath === ".." ||
    !relativePath.startsWith(".drizzle-check-")
  ) {
    throw new Error(`Refusing to clean unexpected migration-check path: ${path}`);
  }
}

try {
  cpSync(migrationRoot, temporaryMigrations, { recursive: true });
  const before = directoryState(temporaryMigrations);
  const outputDirectory = `./${relative(dbRoot, temporaryMigrations)}`;
  const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const result = spawnSync(
    command,
    [
      "exec",
      "drizzle-kit",
      "generate",
      "--dialect=postgresql",
      "--schema=./src/schema.ts",
      `--out=${outputDirectory}`,
    ],
    {
      cwd: dbRoot,
      encoding: "utf8",
      env: { ...process.env, CI: "1" },
      input: "",
      maxBuffer: 10 * 1024 * 1024,
    },
  );

  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    throw new Error(`Drizzle migration drift check exited with status ${String(result.status)}`);
  }

  const changes = changedPaths(before, directoryState(temporaryMigrations));
  if (changes.length > 0) {
    throw new Error(
      `Database schema drift detected in: ${changes.join(", ")}. Run pnpm db:generate and commit the generated migration history.`,
    );
  }

  console.log("Database schema and generated migration history are synchronized.");
} finally {
  assertTemporaryPath(temporaryRoot);
  rmSync(temporaryRoot, { recursive: true, force: true });
}
