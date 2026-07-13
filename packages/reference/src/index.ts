/*
 * Canonical slug → name reference shared across apps (admin, future partner
 * dashboards). The website's rich content (rates, FAQs, icons) keeps these
 * same slugs; keep the two in sync. ponytail: website should consume this too
 * — deferred refactor tracked in todo.md.
 */

export * from "./format";

export interface ProductRef {
  slug: string;
  name: string;
  shortName: string;
}

export const products: ProductRef[] = [
  { slug: "home-loan", name: "Home Loan", shortName: "Home" },
  { slug: "loan-against-property", name: "Loan Against Property", shortName: "LAP" },
  { slug: "business-loan", name: "Business Loan", shortName: "Business" },
  { slug: "personal-loan", name: "Personal Loan", shortName: "Personal" },
  { slug: "vehicle-loan", name: "Vehicle Loan", shortName: "Vehicle" },
  { slug: "education-loan", name: "Education Loan", shortName: "Education" },
  { slug: "working-capital", name: "Working Capital · OD / CC", shortName: "Working Capital" },
  { slug: "equipment-finance", name: "Equipment Finance", shortName: "Equipment" },
  { slug: "credit-cards", name: "Credit Cards", shortName: "Cards" },
];

export interface BankRef {
  slug: string;
  name: string;
  kind: "bank" | "nbfc";
}

export const banks: BankRef[] = [
  { slug: "sbi", name: "State Bank of India", kind: "bank" },
  { slug: "hdfc", name: "HDFC Bank", kind: "bank" },
  { slug: "icici", name: "ICICI Bank", kind: "bank" },
  { slug: "axis", name: "Axis Bank", kind: "bank" },
  { slug: "kotak", name: "Kotak Mahindra Bank", kind: "bank" },
  { slug: "indusind", name: "IndusInd Bank", kind: "bank" },
  { slug: "bajaj", name: "Bajaj Finserv", kind: "nbfc" },
  { slug: "tata", name: "Tata Capital", kind: "nbfc" },
  { slug: "aditya-birla", name: "Aditya Birla Capital", kind: "nbfc" },
];

export const productName = (slug: string | null | undefined) =>
  products.find((p) => p.slug === slug)?.name ?? slug ?? "—";

export const bankName = (slug: string | null | undefined) =>
  banks.find((b) => b.slug === slug)?.name ?? slug ?? "—";

// Human labels for the DB enums (packages/db).
export const leadKindLabels: Record<string, string> = {
  enquiry: "Enquiry",
  referral: "Referral",
  contact: "Contact",
  cibil_notify: "CIBIL Notify",
};

export const leadStatusLabels: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  docs_collected: "Docs Collected",
  logged_in: "Logged In",
  approved: "Approved",
  declined: "Declined",
  disbursed: "Disbursed",
  lost: "Lost",
};

export const loanCaseStatusLabels: Record<string, string> = {
  logged_in: "Logged In",
  approved: "Approved",
  declined: "Declined",
  disbursed: "Disbursed",
};

/** Coarse channel from a website lead's kind (no partner attribution). */
export const channelForKind = (kind: string) =>
  kind === "referral" ? "Website · Referral" : "Website · Direct";

/*
 * Channel for any lead, preferring partner attribution over website kind.
 * partnerType is looked up by the caller from the lead's partner_id.
 */
export function channelForLead(
  lead: { kind: string; partnerId?: string | null },
  partnerType?: "business" | "referral" | null,
): string {
  if (lead.partnerId) {
    return partnerType === "referral" ? "Referral Partner" : "Business Partner";
  }
  return channelForKind(lead.kind);
}

export const partnerTypeLabels: Record<string, string> = {
  business: "Business Partner",
  referral: "Referral Partner",
};

export const partnerStatusLabels: Record<string, string> = {
  pending: "Pending verification",
  verified: "Verified",
  rejected: "Rejected",
};

export interface PartnerDoc {
  type: string;
  label: string;
  required: boolean;
}

// Drives the KYC upload UI (partners) and the verification checklist (admin).
export const partnerDocTypes: PartnerDoc[] = [
  { type: "pan", label: "PAN Card", required: true },
  { type: "aadhaar", label: "Aadhaar Card", required: true },
  { type: "photo", label: "Passport-size Photo", required: true },
  { type: "cheque", label: "Cancelled Cheque", required: true },
  { type: "gst", label: "GST Certificate", required: false },
];

export const partnerDocTypeLabels: Record<string, string> = Object.fromEntries(
  partnerDocTypes.map((d) => [d.type, d.label]),
);

/** "Payout" for business partners, "Incentive" for referral partners. */
export const earningsLabel = (type: string) => (type === "business" ? "Payout" : "Incentive");
