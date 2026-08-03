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
import { ActionFeedback } from "@/components/action-feedback";

interface LeadNoteFormProps {
  leadId: string;
}

export function LeadNoteForm({ leadId }: LeadNoteFormProps) {
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

interface LeadPipelineFormProps {
  leadId: string;
  status: LeadStatus;
  assignedTo: string | null;
  assigneeName: string | null;
  employees: Array<{ id: string; name: string }>;
  caseStatuses: LoanCaseStatus[];
  /** Only an admin may reassign. The action refuses a change either way. */
  canAssign: boolean;
}

export function LeadPipelineForm({
  leadId,
  status,
  assignedTo,
  assigneeName,
  employees,
  caseStatuses,
  canAssign,
}: LeadPipelineFormProps) {
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
      {/* Not rendered for an employee, so the field is never submitted — the
          server refuses a changed assignee from a non-admin regardless. */}
      {canAssign ? (
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
      ) : (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Assigned to</p>
          <p className="mt-0.5 text-navy-900">{assigneeName ?? "Unassigned"}</p>
        </div>
      )}
      <ActionFeedback state={state} success="Pipeline saved." />
      <Button type="submit" size="sm" variant="secondary" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
