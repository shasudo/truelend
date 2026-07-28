"use client";

import type { ReactNode } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { Button, SubmitButton } from "@truelend/ui";
import {
  createLoanCaseAction,
  updateLoanCaseAction,
  type LoanActionResult,
} from "@/lib/loan-actions";

function ActionFeedback({ state, success }: { state: LoanActionResult; success?: string }) {
  return (
    <>
      {state.error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}
      {state.ok && success && (
        <p role="status" className="text-sm text-navy-700">
          {success}
        </p>
      )}
    </>
  );
}

export function CreateLoanCaseForm({
  leadId,
  cancelHref,
  children,
}: {
  leadId: string;
  cancelHref: string;
  children: ReactNode;
}) {
  const [state, action] = useActionState<LoanActionResult, FormData>(createLoanCaseAction, {});

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="leadId" value={leadId} />
      {children}
      <ActionFeedback state={state} />
      <div className="flex flex-col gap-2 border-t border-hairline pt-6 min-[420px]:flex-row">
        <SubmitButton pendingText="Creating…">Create loan case</SubmitButton>
        <Button type="button" variant="ghost" asChild>
          <Link href={cancelHref}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}

export function UpdateLoanCaseForm({ caseId, children }: { caseId: string; children: ReactNode }) {
  const [state, action] = useActionState<LoanActionResult, FormData>(updateLoanCaseAction, {});

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="caseId" value={caseId} />
      {children}
      <ActionFeedback state={state} success="Loan case saved." />
      <div className="border-t border-hairline pt-6">
        <SubmitButton pendingText="Saving…">Save changes</SubmitButton>
      </div>
    </form>
  );
}
