export const partnerReviewSensitiveFields = [
  "occupation",
  "designation",
  "pan",
  "address",
  "bankName",
  "accountHolder",
  "accountNumber",
  "bankBranch",
  "ifsc",
  "nomineeName",
  "nomineeAadhaar",
  "nomineePhone",
] as const;

export type PartnerReviewSensitiveField = (typeof partnerReviewSensitiveFields)[number];

type PartnerReviewSensitiveValues = {
  [Field in PartnerReviewSensitiveField]: unknown;
};

export function changedPartnerReviewFields(
  before: PartnerReviewSensitiveValues,
  after: PartnerReviewSensitiveValues,
): PartnerReviewSensitiveField[] {
  return partnerReviewSensitiveFields.filter((field) => before[field] !== after[field]);
}

export function partnerRejectionRefusal(state: {
  status: string;
  submittedAt: Date | null;
}): string | null {
  if (state.status === "verified") {
    return "This Referral Partner is already verified. Revoke verification before rejecting.";
  }
  if (state.status === "rejected") {
    return "This application has already been rejected. Reload before taking another action.";
  }
  if (state.status !== "pending" || state.submittedAt == null) {
    return "This application is not currently awaiting review.";
  }
  return null;
}
