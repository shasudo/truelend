import { partnerDocTypes } from "@truelend/reference";
import type { Partner } from "@truelend/db";

// Fields every partner must supply before the KYC application can be submitted.
// zod already enforces these at save time; this is the submit-gate mirror.
// ponytail: admin/(dashboard)/partners/[id] mirrors this for its approve gate —
// keep the two in sync; the DB `partners_review_state_valid` constraint is the
// final guard for `verified` and covers pan/address/bank regardless.
export function isApplicationComplete(
  partner: Pick<
    Partner,
    | "type"
    | "pan"
    | "address"
    | "bankName"
    | "accountHolder"
    | "accountNumber"
    | "bankBranch"
    | "ifsc"
    | "nomineeName"
    | "nomineeAadhaar"
    | "nomineePhone"
    | "productsHandled"
    | "yearsExperience"
    | "monthlyVolumeLoansPaise"
    | "monthlyVolumeInsurancePaise"
    | "monthlyVolumeMutualFundsPaise"
    | "residenceAddress"
    | "occupation"
    | "designation"
  >,
  uploadedDocTypes: Set<string>,
): boolean {
  const commonDone = Boolean(
    partner.pan &&
    partner.address &&
    partner.bankName &&
    partner.accountHolder &&
    partner.accountNumber &&
    partner.bankBranch &&
    partner.ifsc &&
    partner.nomineeName &&
    partner.nomineeAadhaar &&
    partner.nomineePhone,
  );
  const typeDone =
    partner.type === "business"
      ? Boolean(
          partner.productsHandled?.length &&
          partner.yearsExperience != null &&
          partner.monthlyVolumeLoansPaise != null &&
          partner.monthlyVolumeInsurancePaise != null &&
          partner.monthlyVolumeMutualFundsPaise != null &&
          partner.residenceAddress,
        )
      : Boolean(partner.occupation && partner.designation);
  const docsDone = partnerDocTypes
    .filter((d) => d.required)
    .every((d) => uploadedDocTypes.has(d.type));
  return commonDone && typeDone && docsDone;
}

/**
 * Partners may edit KYC (PAN/GST/address/bank + documents) only while it's a
 * draft — pending and not yet submitted — or after a rejection, to fix and
 * resubmit. A verified profile, or one awaiting review, is LOCKED: changing
 * details or swapping documents then would bypass the review it passed or is
 * mid-way through. Enforced server-side in every KYC mutation, not just the UI.
 */
export function kycEditable(partner: {
  status: "pending" | "verified" | "rejected";
  submittedAt: Date | null;
}): boolean {
  if (partner.status === "verified") return false;
  if (partner.status === "pending" && partner.submittedAt != null) return false;
  return true;
}
