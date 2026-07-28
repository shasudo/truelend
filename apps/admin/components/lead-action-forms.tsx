"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button, Field, Select, Textarea } from "@truelend/ui";
import {
  bestLoanCaseOutcome,
  leadStatusLabels,
  leadStatusValues,
  type LeadStatus,
  type LoanCaseStatus,
} from "@truelend/reference";
import {
  addLeadNoteAction,
  updateLeadPipelineAction,
  type LeadActionResult,
} from "@/lib/lead-actions";

function ActionFeedback({ state, success }: { state: LeadActionResult; success: string }) {
  return (
    <>
      {state.error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}
      {state.ok && (
        <p role="status" className="text-sm text-navy-700">
          {success}
        </p>
      )}
    </>
  );
}

export function LeadNoteForm({ leadId }: { leadId: string }) {
  const [state, action, pending] = useActionState<LeadActionResult, FormData>(
    addLeadNoteAction,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="mt-4 space-y-3">
      <input type="hidden" name="leadId" value={leadId} />
      <Field label="Note" htmlFor="lead-note" required>
        <Textarea
          id="lead-note"
          name="body"
          required
          maxLength={4000}
          placeholder="Log a call, note next steps…"
          className="min-h-20"
        />
      </Field>
      <ActionFeedback state={state} success="Note added." />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Adding…" : "Add note"}
      </Button>
    </form>
  );
}

export function LeadPipelineForm({
  leadId,
  status,
  assignedTo,
  employees,
  caseStatuses,
}: {
  leadId: string;
  status: LeadStatus;
  assignedTo: string | null;
  employees: Array<{ id: string; name: string }>;
  caseStatuses: LoanCaseStatus[];
}) {
  const [state, action, pending] = useActionState<LeadActionResult, FormData>(
    updateLeadPipelineAction,
    {},
  );
  const caseOutcome = bestLoanCaseOutcome(caseStatuses);

  return (
    <form action={action} className="mt-4 space-y-4">
      <input type="hidden" name="leadId" value={leadId} />
      <Field label="Status" htmlFor="status">
        <Select id="status" name="status" defaultValue={caseOutcome ?? status}>
          {leadStatusValues.map((value) => (
            <option
              key={value}
              value={value}
              disabled={caseOutcome !== null && value !== caseOutcome}
            >
              {leadStatusLabels[value]}
            </option>
          ))}
        </Select>
      </Field>
      {caseOutcome && (
        <p className="text-xs text-muted">
          Loan case outcomes control this status. Update a loan case to change it.
        </p>
      )}
      <Field label="Assigned to" htmlFor="assignedTo">
        <Select id="assignedTo" name="assignedTo" defaultValue={assignedTo ?? ""}>
          <option value="">Unassigned</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.name}
            </option>
          ))}
        </Select>
      </Field>
      <ActionFeedback state={state} success="Pipeline saved." />
      <Button type="submit" size="sm" variant="secondary" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
