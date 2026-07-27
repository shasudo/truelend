import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const appRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function source(path: string): string {
  return readFileSync(join(appRoot, path), "utf8");
}

void test("lead mutations return inline state and keep diagnostics bounded", () => {
  const actions = source("lib/lead-actions.ts");

  for (const action of ["updateLeadPipelineAction", "addLeadNoteAction"]) {
    assert.match(
      actions,
      new RegExp(
        `export async function ${action}\\([\\s\\S]*?formData: FormData,[\\s\\S]*?\\): Promise<LeadActionState>`,
      ),
    );
  }
  assert.match(actions, /catch \(error\) \{/);
  assert.match(actions, /errorType: error instanceof Error \? error\.name : "unknown"/);
  assert.doesNotMatch(actions, /error\.message/);
  assert.match(actions, /\.from\(schema\.loanCases\)/);
  assert.match(actions, /return "case_conflict" as const/);
});

void test("loan mutations return inline state while successful creation still redirects", () => {
  const actions = source("lib/loan-actions.ts");

  for (const action of ["createLoanCaseAction", "updateLoanCaseAction"]) {
    assert.match(
      actions,
      new RegExp(
        `export async function ${action}\\([\\s\\S]*?formData: FormData,[\\s\\S]*?\\): Promise<LoanActionState>`,
      ),
    );
  }
  assert.match(actions, /redirect\(`\/loan-cases\/\$\{newId\}`\)/);
  assert.match(actions, /errorType: error instanceof Error \? error\.name : "unknown"/);
  assert.doesNotMatch(actions, /error\.message/);
  assert.match(actions, /return \{ kind: "missing" \} as const/);
  assert.match(actions, /return \{ kind: "missing_case" \} as const/);
});

void test("admin lead and loan forms render server action errors inline", () => {
  const leadForms = source("components/lead-action-forms.tsx");
  const loanForms = source("components/loan-case-action-forms.tsx");
  const leadPage = source("app/(dashboard)/leads/[id]/page.tsx");
  const createPage = source("app/(dashboard)/loan-cases/new/page.tsx");
  const updatePage = source("app/(dashboard)/loan-cases/[id]/page.tsx");

  assert.match(leadForms, /useActionState<LeadActionState, FormData>/);
  assert.match(loanForms, /useActionState<LoanActionState, FormData>/);
  assert.match(leadForms, /role="alert"/);
  assert.match(loanForms, /role="alert"/);
  assert.match(leadForms, /Loan case outcomes control this status/);

  assert.match(leadPage, /<LeadNoteForm leadId=\{lead\.id\} \/>/);
  assert.match(leadPage, /<LeadPipelineForm/);
  assert.match(createPage, /<CreateLoanCaseForm/);
  assert.match(updatePage, /<UpdateLoanCaseForm/);
  assert.doesNotMatch(
    `${leadPage}\n${createPage}\n${updatePage}`,
    /<form action=\{(?:addLeadNoteAction|updateLeadPipelineAction|createLoanCaseAction|updateLoanCaseAction)\}/,
  );
});
