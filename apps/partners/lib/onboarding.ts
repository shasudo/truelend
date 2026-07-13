import { partnerDocTypes } from "@truelend/reference";

export function isApplicationComplete(
  partner: {
    pan: string | null;
    address: string | null;
    accountHolder: string | null;
    accountNumber: string | null;
    ifsc: string | null;
  },
  uploadedDocTypes: Set<string>,
): boolean {
  const detailsDone = Boolean(
    partner.pan &&
    partner.address &&
    partner.accountHolder &&
    partner.accountNumber &&
    partner.ifsc,
  );
  const docsDone = partnerDocTypes
    .filter((d) => d.required)
    .every((d) => uploadedDocTypes.has(d.type));
  return detailsDone && docsDone;
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
