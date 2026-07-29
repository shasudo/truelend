import { StatusBadge as Pill } from "@truelend/ui";
import { leadStatusLabels, loanCaseStatusLabels, pipelineStatusTone } from "@truelend/reference";

interface StatusBadgeProps {
  status: string;
  kind?: "lead" | "case";
}

export function StatusBadge({ status, kind = "lead" }: StatusBadgeProps) {
  const label = (kind === "case" ? loanCaseStatusLabels : leadStatusLabels)[status] ?? status;
  return <Pill tone={pipelineStatusTone(status)} label={label} />;
}
