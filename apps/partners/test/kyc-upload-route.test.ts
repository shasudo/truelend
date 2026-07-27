import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const appRoot = dirname(dirname(fileURLToPath(import.meta.url)));

void test("KYC upload keeps JSON responses and preserves bytes after an ambiguous commit", () => {
  const route = readFileSync(join(appRoot, "app/api/kyc/upload/route.ts"), "utf8");

  assert.match(route, /Response\.json\(\{ error: "Please sign in again\." \}, \{ status: 401 \}\)/);
  assert.match(route, /let databaseOutcomeUnknown = false/);
  assert.match(route, /databaseOutcomeUnknown = true;[\s\S]*await db\.transaction/);
  assert.match(route, /if \(uploadedKey && !databaseOutcomeUnknown\)/);
  assert.match(route, /Refresh the document list before trying again/);
  assert.match(route, /uncertain: databaseOutcomeUnknown \|\| undefined/);
  assert.doesNotMatch(route, /new Response\("(?:Unauthorized|No Referral Partner profile)"/);
});

void test("KYC upload UI reconciles uncertain and lost responses before a retry", () => {
  const component = readFileSync(join(appRoot, "components/kyc-upload.tsx"), "utf8");

  assert.match(component, /useEffect\(\(\) => \{\s*setDone\(uploaded\)/);
  assert.match(component, /if \(data\.uncertain\) router\.refresh\(\)/);
  assert.match(component, /catch \{\s*setError\([^;]+;\s*router\.refresh\(\)/);
});
