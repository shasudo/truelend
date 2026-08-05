import type { BankApplyLeadStatus } from "@truelend/reference";

/*
 * ponytail: keyed only off the bank's top-level Status column. The sample
 * export only ever shows in-flight rows (Status "IN PROGRESS" even once
 * Stage reads "Approved" or Workflow_Status reads "CARD ISSUAL INITIATED"),
 * so there's no confirmed terminal-status example to widen the match against
 * yet. Tune the keyword lists here once a real approved/rejected/issued
 * export row is seen — Stage and Workflow_Status stay available on the row
 * verbatim (bankStage, bankWorkflowStatus, bankRaw) for anyone who needs them
 * meanwhile.
 */
export function deriveBankLeadStatus(fields: { status?: string }): BankApplyLeadStatus {
  const status = (fields.status ?? "").trim().toLowerCase();
  if (/reject|declin/.test(status)) return "rejected";
  if (/disburs|card issued|closed/.test(status)) return "card_issued";
  if (/approved/.test(status)) return "approved";
  return "in_progress";
}
