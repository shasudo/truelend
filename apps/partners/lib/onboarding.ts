import { partnerDocTypes } from "@truelend/reference";

/** True when a partner has filled details AND uploaded every required document. */
export function isApplicationComplete(
  partner: {
    pan: string | null;
    address: string | null;
    accountNumber: string | null;
    ifsc: string | null;
  },
  uploadedDocTypes: Set<string>,
): boolean {
  const detailsDone = Boolean(
    partner.pan && partner.address && partner.accountNumber && partner.ifsc,
  );
  const docsDone = partnerDocTypes
    .filter((d) => d.required)
    .every((d) => uploadedDocTypes.has(d.type));
  return detailsDone && docsDone;
}
