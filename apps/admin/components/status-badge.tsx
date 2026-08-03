import { StatusBadge as Pill } from "@truelend/ui";
import {
  callStatusLabels,
  leadStatusLabels,
  loanCaseStatusLabels,
  pipelineStatusTone,
} from "@truelend/reference";

interface StatusBadgeProps {
  status: string;
  kind?: "lead" | "case" | "call";
}

const labelsFor = { lead: leadStatusLabels, case: loanCaseStatusLabels, call: callStatusLabels };

export function StatusBadge({ status, kind = "lead" }: StatusBadgeProps) {
  const label = labelsFor[kind][status] ?? status;
  return <Pill tone={pipelineStatusTone(status)} label={label} />;
}
