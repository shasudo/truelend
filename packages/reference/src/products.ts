export interface ProductRef {
  slug: string;
  name: string;
  shortName: string;
}

export const products = [
  { slug: "home-loan", name: "Home Loan", shortName: "Home" },
  { slug: "loan-against-property", name: "Loan Against Property", shortName: "LAP" },
  { slug: "business-loan", name: "Business Loan", shortName: "Business" },
  { slug: "personal-loan", name: "Personal Loan", shortName: "Personal" },
  { slug: "vehicle-loan", name: "Vehicle Loan", shortName: "Vehicle" },
  { slug: "education-loan", name: "Education Loan", shortName: "Education" },
  { slug: "working-capital", name: "Working Capital", shortName: "Working Capital" },
  { slug: "equipment-finance", name: "Equipment Finance", shortName: "Equipment" },
  { slug: "credit-cards", name: "Credit Cards", shortName: "Cards" },
] as const satisfies readonly ProductRef[];

export type ProductSlug = (typeof products)[number]["slug"];

export const productSlugs = products.map((product) => product.slug) as [
  ProductSlug,
  ...ProductSlug[],
];

const productsBySlug: ReadonlyMap<string, ProductRef> = new Map(
  products.map((product) => [product.slug, product]),
);

export function isProductSlug(value: string): value is ProductSlug {
  return productsBySlug.has(value);
}

export function productName(slug: string | null | undefined): string {
  return (slug && productsBySlug.get(slug)?.name) || slug || "—";
}

export interface BankRef {
  slug: string;
  name: string;
  kind: "bank" | "nbfc";
}

export const banks = [
  { slug: "sbi", name: "State Bank of India", kind: "bank" },
  { slug: "hdfc", name: "HDFC Bank", kind: "bank" },
  { slug: "icici", name: "ICICI Bank", kind: "bank" },
  { slug: "axis", name: "Axis Bank", kind: "bank" },
  { slug: "kotak", name: "Kotak Mahindra Bank", kind: "bank" },
  { slug: "indusind", name: "IndusInd Bank", kind: "bank" },
  { slug: "bajaj", name: "Bajaj Finserv", kind: "nbfc" },
  { slug: "tata", name: "Tata Capital", kind: "nbfc" },
  { slug: "aditya-birla", name: "Aditya Birla Capital", kind: "nbfc" },
] as const satisfies readonly BankRef[];

export type BankSlug = (typeof banks)[number]["slug"];

const banksBySlug: ReadonlyMap<string, BankRef> = new Map(banks.map((bank) => [bank.slug, bank]));

export function bankForSlug(slug: string | null | undefined): BankRef | undefined {
  return slug ? banksBySlug.get(slug) : undefined;
}

export function bankName(slug: string | null | undefined): string {
  return bankForSlug(slug)?.name ?? slug ?? "—";
}

// Product groups that control conditional fields on detailed lead forms.
export const securedProducts: ReadonlySet<string> = new Set([
  "home-loan",
  "loan-against-property",
  "vehicle-loan",
  "equipment-finance",
]);
export const businessProducts: ReadonlySet<string> = new Set(["business-loan", "working-capital"]);
export const cardProducts: ReadonlySet<string> = new Set(["credit-cards"]);
