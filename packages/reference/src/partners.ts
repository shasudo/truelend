export const partnerTypeValues = ["business", "referral"] as const;
export type PartnerType = (typeof partnerTypeValues)[number];

export const partnerTypeLabels = {
  business: "Business Partner",
  referral: "Referral Partner",
} as const satisfies Record<PartnerType, string>;

export function partnerTypeLabel(type: string): string {
  if (type === "business") return partnerTypeLabels.business;
  if (type === "referral") return partnerTypeLabels.referral;
  return type;
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

// Shared by KYC checkboxes, server validation, and the admin review display.
export const partnerProductOptions = [
  "Loans",
  "Insurance",
  "Mutual Funds",
  "Real Estate",
  "Taxation",
] as const;

export function earningsLabel(type: string): string {
  return type === "business" ? "Payout" : "Incentive";
}
