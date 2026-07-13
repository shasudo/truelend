import { StatusBadge as Pill } from "@truelend/ui";
import { leadStatusLabels, loanCaseStatusLabels } from "@truelend/reference";

export function StatusBadge({ status, kind = "lead" }: { status: string; kind?: "lead" | "case" }) {
  const label = (kind === "case" ? loanCaseStatusLabels : leadStatusLabels)[status] ?? status;
  return <Pill status={status} label={label} />;
}
