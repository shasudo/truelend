import { StatusBadge as Pill } from "@truelend/ui";
import { leadStatusLabels, loanCaseStatusLabels } from "@truelend/reference";

// Thin wrapper: maps a lead/case status to its label, then renders the shared
// color-coded pill from @truelend/ui (also used by the partner dashboard).
export function StatusBadge({ status, kind = "lead" }: { status: string; kind?: "lead" | "case" }) {
  const label = (kind === "case" ? loanCaseStatusLabels : leadStatusLabels)[status] ?? status;
  return <Pill status={status} label={label} />;
}
