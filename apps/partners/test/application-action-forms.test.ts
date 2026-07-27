import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const appRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function source(path: string): string {
  return readFileSync(join(appRoot, path), "utf8");
}

void test("application transitions use action state and expose failures inline", () => {
  const forms = source("components/application-action-forms.tsx");

  assert.ok(forms.startsWith('"use client"'));
  assert.match(forms, /useActionState<KycState, FormData>\(submitForReview, initialState\)/);
  assert.match(forms, /useActionState<KycState, FormData>\(reopenApplication, initialState\)/);
  assert.equal(forms.match(/<form action=\{action\}>/g)?.length, 2);
  assert.equal(forms.match(/role="alert"/g)?.length, 2);
  assert.match(forms, /router\.replace\("\/dashboard"\)/);
  assert.match(forms, /router\.refresh\(\)/);
  assert.doesNotMatch(forms, /<form action=\{(?:submitForReview|reopenApplication)\}>/);
});

void test("status screens render the action-state forms instead of raw server actions", () => {
  const onboarding = source("components/partner-status-screen.tsx");
  const underReview = source("components/under-review-screen.tsx");

  assert.match(onboarding, /<SubmitForReviewForm \/>/);
  assert.doesNotMatch(onboarding, /from ["']@\/lib\/kyc-actions["']/);
  assert.match(underReview, /<ReopenApplicationForm \/>/);
  assert.match(underReview, /send the review decision/);
  assert.doesNotMatch(underReview, /sent a confirmation email/);
  assert.doesNotMatch(underReview, /from ["']@\/lib\/kyc-actions["']/);
});

void test("application transition actions return state for useActionState", () => {
  const actions = source("lib/kyc-actions.ts");

  for (const action of ["submitForReview", "reopenApplication"]) {
    assert.match(
      actions,
      new RegExp(
        `export async function ${action}\\(_prev: KycState, _formData: FormData\\): Promise<KycState>`,
      ),
    );
  }
  assert.match(actions, /outcome === "already_submitted"\) return \{ ok: true \}/);
  assert.match(actions, /outcome === "already_reopened"\) return \{ ok: true \}/);
});
