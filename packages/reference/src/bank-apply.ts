import type { BankSlug } from "./products";

/*
 * QR-driven quick-apply flow: a partner shares a QR code that lands a
 * customer on the website, they enter just their phone number, then tap a
 * bank product to go straight to that bank's own hosted application page
 * with a tracking code embedded in the URL. Deliberately not part of the
 * main loan-enquiry `leads` table — no loan-application detail is captured,
 * and the record only starts to matter once the bank's own CSV export
 * reconciles a status against it.
 */

export interface BankApplyProduct {
  slug: string;
  label: string;
  bankSlug: BankSlug;
  /** Builds the bank's hosted application URL for a given tracking code. */
  buildApplyUrl: (trackingCode: string) => string;
  /**
   * False when the bank's hosted URL has no slot for a per-customer tracking
   * code (a static DSA-channel link, not a per-lead one) — HDFC's export
   * carries no tracking code or phone number to match back to a bank_apply_leads
   * row either, so a non-trackable product skips that record entirely and is
   * reconciled, if at all, from the bank's own MIS report (see
   * hdfcApplicationCsvColumns below), not from bank_apply_leads.
   */
  trackable: boolean;
}

export const bankApplyProducts: readonly BankApplyProduct[] = [
  {
    slug: "indusind-credit-card",
    label: "IndusInd Credit Card",
    bankSlug: "indusind",
    trackable: true,
    buildApplyUrl: (trackingCode) =>
      "https://induseasycredit.indusind.bank.in/customer/credit-card/new-lead" +
      "?utm_source=assisted&utm_medium=IBLV899SOUTHIBL101549%20" +
      `&utm_campaign=Credit-Card&utm_content=TRUE${trackingCode}`,
  },
  {
    slug: "hdfc-credit-card",
    label: "HDFC Credit Card",
    bankSlug: "hdfc",
    trackable: false,
    buildApplyUrl: () =>
      "https://applyonline.hdfc.bank.in/cards/credit-cards.html" +
      "?CHANNELSOURCE=ZETA&CHANNEL=DSA&DSACode=XFIF&LGcode=FIFH591&LCcode=FIFH591&LC2=FIFH591&SMcode=K13395",
  },
];

const bankApplyProductsBySlug: ReadonlyMap<string, BankApplyProduct> = new Map(
  bankApplyProducts.map((product) => [product.slug, product]),
);

export function isBankApplyProductSlug(value: string): boolean {
  return bankApplyProductsBySlug.has(value);
}

export function bankApplyProductForSlug(slug: string): BankApplyProduct | undefined {
  return bankApplyProductsBySlug.get(slug);
}

/*
 * Coarse status bucket shown to partners/admin, derived from the bank's CSV
 * export on each admin import (see deriveBankLeadStatus in the admin app).
 * The raw bank Status/Sub_Status/Stage/Workflow_Status text is kept
 * alongside on the row for anyone who needs the bank's own wording.
 */
export const bankApplyLeadStatusValues = [
  "sent",
  "in_progress",
  "approved",
  "rejected",
  "card_issued",
] as const;
export type BankApplyLeadStatus = (typeof bankApplyLeadStatusValues)[number];

export const bankApplyLeadStatusLabels: Readonly<Record<string, string>> = {
  sent: "Sent",
  in_progress: "In Progress",
  approved: "Approved",
  rejected: "Rejected",
  card_issued: "Card Issued",
} satisfies Record<BankApplyLeadStatus, string>;

/*
 * CSV header aliases for the bank's periodic status export. Only utm_content
 * is required — that is the tracking code we generated — everything else is
 * best-effort: a column IndusInd renames or drops next quarter still leaves
 * the import working, just with less detail per matched row.
 */
export const bankLeadCsvColumns = {
  trackingCode: ["utm_content"],
  applicationId: ["application_id"],
  status: ["status"],
  subStatus: ["sub_status"],
  stage: ["stage"],
  workflowStatus: ["workflow_status"],
  cardIssualDate: ["cardissualdate", "card issual date"],
} as const;

export type BankLeadCsvColumn = keyof typeof bankLeadCsvColumns;

export const bankLeadCsvRequiredColumns = [
  "trackingCode",
] as const satisfies readonly BankLeadCsvColumn[];

/*
 * HDFC's weekly MIS export (the "CardAssist & Sales Force Waterfall MIS")
 * has no tracking code or phone number column — it's already TrueLend's
 * whole book of HDFC business for the period, not the bank's full portfolio
 * filtered by us. So unlike bankLeadCsvColumns above, there's nothing here
 * to reconcile against a bank_apply_leads row; these rows land in their own
 * hdfc_applications report table instead. Save the .xlsx as .csv before
 * uploading — same importer as the IndusInd export, just a different bank
 * and column set.
 */
export const hdfcApplicationCsvColumns = {
  applicationReferenceNumber: ["application_reference_number"],
  customerName: ["customer_name"],
  city: ["city"],
  state: ["state"],
  currentStage: ["current_stage"],
  finalDecision: ["final_decision"],
  creationDateTime: ["creation_date_time"],
  dsaCode: ["top 10 dsa code"],
} as const;

export type HdfcApplicationCsvColumn = keyof typeof hdfcApplicationCsvColumns;

export const hdfcApplicationCsvRequiredColumns = [
  "applicationReferenceNumber",
] as const satisfies readonly HdfcApplicationCsvColumn[];
