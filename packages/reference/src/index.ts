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

// Products a Business Partner distributes today (spreadsheet "Products Handled").
// Shared by the KYC form checkboxes, its server validation, and admin display.
export const partnerProductOptions = [
  "Loans",
  "Insurance",
  "Mutual Funds",
  "Real Estate",
  "Taxation",
] as const;

export interface PartnerDoc {
  type: string;
  label: string;
  required: boolean;
}

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

export const earningsLabel = (type: string) => (type === "business" ? "Payout" : "Incentive");

/* ------------------------------------------------------------------ */
/* Loan-application fields — shared option sets for the detailed lead   */
/* forms (website enquiry/referral, partner submissions). DB stores the */
/* `value`; forms render the `label`. Money is paise; convert with      */
/* rupeesToPaise at the form boundary.                                  */
/* ------------------------------------------------------------------ */

export const employmentTypes = [
  { value: "salaried", label: "Salaried" },
  { value: "self_employed_professional", label: "Self-employed professional" },
  { value: "self_employed_business", label: "Self-employed / Business owner" },
] as const;

export const residenceTypes = [
  { value: "owned", label: "Owned" },
  { value: "rented", label: "Rented" },
  { value: "family", label: "Family-owned" },
  { value: "company", label: "Company-provided" },
] as const;

export type EmploymentType = (typeof employmentTypes)[number]["value"];
export type ResidenceType = (typeof residenceTypes)[number]["value"];

export const employmentTypeValues = employmentTypes.map((e) => e.value) as [
  EmploymentType,
  ...EmploymentType[],
];
export const residenceTypeValues = residenceTypes.map((r) => r.value) as [
  ResidenceType,
  ...ResidenceType[],
];

export const employmentTypeLabels: Record<string, string> = Object.fromEntries(
  employmentTypes.map((e) => [e.value, e.label]),
);
export const residenceTypeLabels: Record<string, string> = Object.fromEntries(
  residenceTypes.map((r) => [r.value, r.label]),
);

// Whole-month tenures offered on the forms.
export const loanTenures = [
  { value: 12, label: "1 year" },
  { value: 24, label: "2 years" },
  { value: 36, label: "3 years" },
  { value: 60, label: "5 years" },
  { value: 84, label: "7 years" },
  { value: 120, label: "10 years" },
  { value: 180, label: "15 years" },
  { value: 240, label: "20 years" },
  { value: 360, label: "30 years" },
] as const;

export const tenureLabel = (months: number | null | undefined) =>
  months == null ? "—" : (loanTenures.find((t) => t.value === months)?.label ?? `${months} months`);

// Products that unlock the conditional fields on the detailed forms.
export const securedProducts = new Set([
  "home-loan",
  "loan-against-property",
  "vehicle-loan",
  "equipment-finance",
]);
export const businessProducts = new Set(["business-loan", "working-capital"]);
