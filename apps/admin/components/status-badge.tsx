import { StatusBadge as Pill } from "@truelend/ui";
import {
  bankApplyLeadStatusLabels,
  callStatusLabels,
  leadStatusLabels,
  loanCaseStatusLabels,
  pipelineStatusTone,
} from "@truelend/reference";

interface StatusBadgeProps {
  status: string;
  kind?: "lead" | "case" | "call" | "bank";
}

const labelsFor = {
  lead: leadStatusLabels,
  case: loanCaseStatusLabels,
  call: callStatusLabels,
  bank: bankApplyLeadStatusLabels,
};

export function StatusBadge({ status, kind = "lead" }: StatusBadgeProps) {
  const label = labelsFor[kind][status] ?? status;
  return <Pill tone={pipelineStatusTone(status)} label={label} />;
}
