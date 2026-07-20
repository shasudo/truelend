import type { ProductCategory, RateRow } from "@/content/types";
import { bankForSlug } from "@truelend/reference";
import type { RateTableRow } from "@truelend/ui";

const rateRange = (r: RateRow) =>
  `${r.interestRate.min.toFixed(2)} – ${r.interestRate.max.toFixed(2)}%`;

export function toRateTableRows(rates: RateRow[]): RateTableRow[] {
  return rates.map((r) => {
    const bank = bankForSlug(r.bankSlug);
    return {
      lender: bank?.name ?? r.bankSlug,
      kind: bank?.kind === "nbfc" ? "NBFC" : "Bank",
      rate: rateRange(r),
      fee: r.processingFee,
      tenure: `${r.maxTenureYears} yrs`,
      amount: r.maxAmount,
    };
  });
}

export function minRateLabel(product: ProductCategory): string {
  if (product.rates.length === 0) {
    const h = product.highlights[0];
    return h ? `${h.label} ${h.value}` : "";
  }
  const min = Math.min(...product.rates.map((r) => r.interestRate.min));
  return `From ${min.toFixed(2)}% p.a.`;
}
