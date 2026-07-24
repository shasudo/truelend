import { referralPartnerLabel } from "./partners";

export const leadKindValues = ["enquiry", "referral", "contact", "cibil_notify"] as const;
export type LeadKind = (typeof leadKindValues)[number];

export const leadKindLabels: Readonly<Record<string, string>> = {
  enquiry: "Enquiry",
  referral: "Referral",
  contact: "Contact",
  cibil_notify: "CIBIL Notify",
} satisfies Record<LeadKind, string>;

export const leadStatusValues = [
  "new",
  "contacted",
  "qualified",
  "docs_collected",
  "logged_in",
  "approved",
  "declined",
  "disbursed",
  "lost",
] as const;
export type LeadStatus = (typeof leadStatusValues)[number];

export const leadStatusLabels: Readonly<Record<string, string>> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  docs_collected: "Docs Collected",
  logged_in: "Logged In",
  approved: "Approved",
  declined: "Declined",
  disbursed: "Disbursed",
  lost: "Lost",
} satisfies Record<LeadStatus, string>;

export const loanCaseStatusValues = ["logged_in", "approved", "declined", "disbursed"] as const;
export type LoanCaseStatus = (typeof loanCaseStatusValues)[number];

export const loanCaseStatusLabels: Readonly<Record<string, string>> = {
  logged_in: "Logged In",
  approved: "Approved",
  declined: "Declined",
  disbursed: "Disbursed",
} satisfies Record<LoanCaseStatus, string>;

export type PipelineStatusTone = "neutral" | "info" | "emphasis" | "success" | "danger";

const pipelineStatusTones: Readonly<Record<string, PipelineStatusTone>> = {
  new: "neutral",
  contacted: "info",
  qualified: "info",
  docs_collected: "info",
  logged_in: "emphasis",
  approved: "emphasis",
  disbursed: "success",
  declined: "danger",
  lost: "danger",
};

export function pipelineStatusTone(status: string): PipelineStatusTone {
  return pipelineStatusTones[status] ?? "neutral";
}

export function channelForKind(kind: string, isPartnerLead = false): string {
  if (isPartnerLead) return referralPartnerLabel;
  return kind === "referral" ? "Website · Referral" : "Website · Direct";
}

// Bump only with reviewed consent copy; every lead-capture surface stores this value.
export const customerConsentVersion = "2026-07-13";

// Shared display/value pairs for detailed website and partner lead forms.
export const employmentTypes = [
  { value: "salaried", label: "Salaried" },
  { value: "self_employed_professional", label: "Self-employed professional" },
  { value: "self_employed_business", label: "Self-employed / Business owner" },
] as const;

export const residenceTypes = [
  { value: "owned", label: "Owned" },
  { value: "rented", label: "Rented" },
  { value: "family", label: "Family-owned" },
  { value: "company", label: "Company-provided" },
] as const;

type EmploymentType = (typeof employmentTypes)[number]["value"];
type ResidenceType = (typeof residenceTypes)[number]["value"];

export const employmentTypeValues = employmentTypes.map((type) => type.value) as [
  EmploymentType,
  ...EmploymentType[],
];
export const residenceTypeValues = residenceTypes.map((type) => type.value) as [
  ResidenceType,
  ...ResidenceType[],
];

export const employmentTypeLabels: Readonly<Record<string, string>> = Object.fromEntries(
  employmentTypes.map((type) => [type.value, type.label]),
);
export const residenceTypeLabels: Readonly<Record<string, string>> = Object.fromEntries(
  residenceTypes.map((type) => [type.value, type.label]),
);

export const loanTenures = [
  { value: 12, label: "1 year" },
  { value: 24, label: "2 years" },
  { value: 36, label: "3 years" },
  { value: 60, label: "5 years" },
  { value: 84, label: "7 years" },
  { value: 120, label: "10 years" },
  { value: 180, label: "15 years" },
  { value: 240, label: "20 years" },
  { value: 360, label: "30 years" },
] as const;

export function tenureLabel(months: number | null | undefined): string {
  return months == null
    ? "—"
    : (loanTenures.find((tenure) => tenure.value === months)?.label ?? `${months} months`);
}

// Purpose-of-loan options for the detailed enquiry form. Value === label so the
// stored `leads.loan_purpose` text reads cleanly in admin without a lookup.
export const loanPurposes = [
  "Home Purchase",
  "Home Construction or Renovation",
  "Business Expansion",
  "Working Capital",
  "Debt Consolidation",
  "Education",
  "Vehicle Purchase",
  "Medical or Emergency",
  "Wedding",
  "Travel",
  "Personal Use",
  "Other",
] as const;

// Experience bands. `value` is the integer lower bound persisted to
// leads.experience_years; the same labels drive the optional "time with current
// employer" select (stored verbatim as text in leads.existing_with_employer).
export const experienceBands = [
  { value: 0, label: "Less than 1 year" },
  { value: 1, label: "1–3 years" },
  { value: 3, label: "3–5 years" },
  { value: 5, label: "5–10 years" },
  { value: 10, label: "More than 10 years" },
] as const;

export const employerTenureLabels = experienceBands.map((band) => band.label);
