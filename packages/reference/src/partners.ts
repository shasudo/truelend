export const referralPartnerLabel = "Referral Partner";

export const referralTypeOptions = [
  { value: "real_estate_professional", label: "Real Estate Professional" },
  { value: "financial_advisor", label: "Financial Advisor" },
  { value: "insurance_advisor", label: "Insurance Advisor" },
  { value: "loan_advisor", label: "Loan Advisor / DSA" },
  { value: "chartered_accountant", label: "Chartered Accountant" },
  { value: "salaried_professional", label: "Salaried Professional" },
  { value: "self_employed_professional", label: "Self-employed Professional" },
  { value: "community_referrer", label: "Community Referrer" },
  { value: "other", label: "Other" },
] as const;

export type ReferralType = (typeof referralTypeOptions)[number]["value"];
export const referralTypeValues = referralTypeOptions.map((option) => option.value) as [
  ReferralType,
  ...ReferralType[],
];

export function referralTypeLabel(value: string | null | undefined): string {
  return referralTypeOptions.find((option) => option.value === value)?.label ?? value ?? "—";
}

export const partnerStatusValues = ["pending", "verified", "rejected"] as const;
export type PartnerStatus = (typeof partnerStatusValues)[number];

export const partnerStatusLabels = {
  pending: "Pending verification",
  verified: "Verified",
  rejected: "Rejected",
} as const satisfies Record<PartnerStatus, string>;

export function partnerStatusLabel(status: string): string {
  if (status === "pending") return partnerStatusLabels.pending;
  if (status === "verified") return partnerStatusLabels.verified;
  if (status === "rejected") return partnerStatusLabels.rejected;
  return status;
}

export const payoutKindValues = ["earned", "paid"] as const;
export type PayoutKind = (typeof payoutKindValues)[number];

export const referralRewardLabel = "Incentive";
