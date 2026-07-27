import { normalizeSafeInteger } from "@truelend/reference";

interface PartnerLedgerTotals {
  earnedPaise: number;
  paidPaise: number;
  outstandingPaise: number;
}

/**
 * Normalizes raw postgres.js aggregate strings without allowing precision loss
 * in the financial ledger.
 */
export function normalizePartnerLedger(earned: unknown, paid: unknown): PartnerLedgerTotals {
  const earnedPaise = normalizeSafeInteger(earned, "Partner earned total");
  const paidPaise = normalizeSafeInteger(paid, "Partner paid total");
  const outstandingPaise = earnedPaise - paidPaise;
  if (!Number.isSafeInteger(outstandingPaise)) {
    throw new RangeError("Partner outstanding total exceeds JavaScript's safe integer range");
  }
  return { earnedPaise, paidPaise, outstandingPaise };
}
