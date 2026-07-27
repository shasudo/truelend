import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const appRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function source(path: string): string {
  return readFileSync(join(appRoot, path), "utf8");
}

void test("team actions bound context failures and refresh uncertain outcomes", () => {
  const actions = source("lib/team-actions.ts");
  const members = source("components/team-members.tsx");
  const createForm = source("components/create-user-form.tsx");

  assert.equal(actions.match(/\bwithTeamAdminContext</g)?.length, 6);
  assert.match(actions, /context = await adminContext\(\)/);
  assert.match(actions, /if \(context\) scheduleAdminRequestContextCleanup\(context\)/);
  assert.match(actions, /uncertain: true/);
  assert.match(members, /if \(res\.uncertain\) router\.refresh\(\)/);
  assert.match(createForm, /if \(state\.uncertain\) router\.refresh\(\)/);
});

void test("partner detail, ledger, and review actions return bounded inline state", () => {
  const actions = source("lib/partner-actions.ts");
  const reviewForms = source("components/partner-review-actions.tsx");
  const detailPage = source("app/(dashboard)/partners/[id]/page.tsx");

  for (const action of [
    "updatePartnerDetailsAction",
    "approvePartnerAction",
    "revokePartnerAction",
    "rejectPartnerAction",
    "recordPayoutAction",
  ]) {
    assert.match(
      actions,
      new RegExp(
        `export async function ${action}\\([\\s\\S]*?formData: FormData,[\\s\\S]*?\\): Promise<`,
      ),
    );
  }
  assert.equal(actions.match(/\bwithPartnerAdminAction</g)?.length, 6);
  assert.match(actions, /partnerRejectionRefusal\(partner\)/);
  assert.match(actions, /changedPartnerReviewFields\(partner, details\)/);
  assert.match(reviewForms, /useActionState<PartnerReviewResult, FormData>/);
  assert.match(reviewForms, /role="alert"/);
  assert.match(detailPage, /<PartnerReviewActions/);
  assert.doesNotMatch(
    detailPage,
    /<form action=\{(?:approvePartnerAction|rejectPartnerAction|revokePartnerAction)\}/,
  );
});

void test("admin KYC upload preserves objects while the database outcome is unknown", () => {
  const upload = source("app/api/kyc/upload/route.ts");
  const uploadForm = source("components/partner-document-upload.tsx");

  assert.match(upload, /databaseOutcomeUnknown = true;[\s\S]*db\.transaction/);
  assert.match(upload, /databaseOutcomeUnknown = false;/);
  assert.match(upload, /if \(uploadedKey && !databaseOutcomeUnknown\)/);
  assert.match(upload, /status: databaseOutcomeUnknown \? 503 : 500/);
  assert.match(upload, /uncertain: databaseOutcomeUnknown \|\| undefined/);
  assert.match(upload, /scheduleAdminBackgroundTask/);
  assert.match(uploadForm, /if \(data\.uncertain\) router\.refresh\(\)/);
  assert.match(uploadForm, /setDone\(uploaded\)/);
});

void test("admin auth construction and readiness cleanup are owned", () => {
  const auth = source("lib/auth.ts");
  const authRoute = source("app/api/auth/[...all]/route.ts");
  const readiness = source("app/api/health/ready/route.ts");

  assert.match(
    auth,
    /const db = createDb[\s\S]*try \{[\s\S]*createAdminAuth[\s\S]*catch \(error\) \{[\s\S]*scheduleAdminRequestContextCleanup/,
  );
  assert.match(
    authRoute,
    /const db = createDb[\s\S]*try \{[\s\S]*const auth = createAdminAuth[\s\S]*finally \{[\s\S]*scheduleAdminRequestContextCleanup/,
  );
  assert.match(readiness, /scheduleAdminRequestContextCleanup\(\{ db: connection, ctx \}\)/);
  assert.doesNotMatch(readiness, /ctx\.waitUntil\(connection\.\$client\.end\(\)\)/);
});
