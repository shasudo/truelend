import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

// node --test (and therefore tsx --test) exits 0 when its glob matches zero
// files - a package with no test files reports "tests 0, pass 0, fail 0" as a
// clean run, indistinguishable from a real pass. Refuse that silently-green
// empty run instead of letting it through.
function findTestFiles(directory) {
  const found = [];
  let entries;
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...findTestFiles(entryPath));
    } else if (/\.test\.tsx?$/.test(entry.name)) {
      found.push(entryPath);
    }
  }
  return found;
}

const extraArgs = process.argv.slice(2);
const testFiles = findTestFiles("test");

if (testFiles.length === 0) {
  throw new Error(
    "No test files found under test/ - refusing to report a passing run for zero tests.",
  );
}

const result = spawnSync("tsx", ["--test", ...extraArgs, ...testFiles], { stdio: "inherit" });
process.exit(result.status ?? 1);
