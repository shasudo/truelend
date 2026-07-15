// Product catalog taxonomy — ported from the TrueLend product research set.
// Drives /products/all/[category]/[item]. Rich per-item content lives in
// content.json (see ./content.ts). `enquirySlug` maps each category/column onto
// a canonical @truelend/reference product slug so every CTA lands on
// /enquiry?product=<slug> with the loan preselected.

export type CatalogItem = {
  slug: string;
  label: string;
  provider?: string;
  blurb?: string;
};

export type CatalogColumn = {
  heading: string;
  /** Overrides the category enquirySlug for this column's items. */
  enquirySlug?: string;
  items: CatalogItem[];
};

export type CatalogCategory = {
  key: string;
  kind: "card" | "loan";
  label: string;
  navLabel?: string;
  tagline: string;
  /** Canonical enquiry product slug (must exist in @truelend/reference). */
  enquirySlug: string;
  facts: { label: string; value: string }[];
  columns: CatalogColumn[];
};

const i = (label: string, slug: string, provider?: string, blurb?: string): CatalogItem => ({
  label,
  slug,
  provider,
  blurb,
});

export const CATEGORIES: CatalogCategory[] = [
  {
    key: "credit-card",
    kind: "card",
    label: "Credit Cards",
    navLabel: "Credit Card",
    tagline: "Compare rewards, travel, fuel and cashback cards from India's leading banks.",
    enquirySlug: "credit-cards",
    facts: [
      { label: "Joining fee", value: "₹0 – ₹5,000" },
      { label: "Reward rate", value: "Up to 5% back" },
      { label: "Interest (APR)", value: "3.4% – 3.6% p.m." },
      { label: "Approval", value: "As fast as 24 hrs" },
    ],
    columns: [
      {
        heading: "Popular Credit Cards",
        items: [
          i("Best Credit Cards in India", "best-credit-cards"),
          i("Kiwi Credit Card", "kiwi", "Kiwi"),
          i("Scapia Credit Card", "scapia", "Scapia"),
          i("Pop Club Credit Card", "pop-club", "Pop"),
          i("Rio Money Credit Card", "rio-money", "Rio"),
          i("Jupiter Credit Card", "jupiter", "Jupiter"),
          i("Rupicard Credit Card", "rupicard", "Rupicard"),
          i("OneCard Credit Card", "onecard", "OneCard"),
          i("MagniFi Credit Card", "magnifi", "MagniFi"),
          i("Card for Online Shopping", "online-shopping"),
        ],
      },
      {
        heading: "HDFC Bank",
        items: [
          i("Swiggy Credit Card", "hdfc-swiggy", "HDFC Bank"),
          i("Tata Neu Plus Credit Card", "hdfc-tata-neu", "HDFC Bank"),
          i("Millennia Credit Card", "hdfc-millennia", "HDFC Bank"),
          i("Freedom Credit Card", "hdfc-freedom", "HDFC Bank"),
          i("IndianOil Credit Card", "hdfc-indianoil", "HDFC Bank"),
          i("MoneyBack+ Credit Card", "hdfc-moneyback-plus", "HDFC Bank"),
          i("UPI RuPay Credit Card", "hdfc-upi-rupay", "HDFC Bank"),
        ],
      },
      {
        heading: "SBI Card",
        items: [
          i("Flipkart SBI Credit Card", "sbi-flipkart", "SBI Card"),
          i("SimplySAVE SBI Card", "sbi-simplysave", "SBI Card"),
          i("SimplyCLICK SBI Card", "sbi-simplyclick", "SBI Card"),
          i("SBI Prime Credit Card", "sbi-prime", "SBI Card"),
          i("SBI Elite Credit Card", "sbi-elite", "SBI Card"),
          i("SBI PULSE Credit Card", "sbi-pulse", "SBI Card"),
          i("BPCL SBI Credit Card", "sbi-bpcl", "SBI Card"),
          i("IRCTC RuPay Credit Card", "sbi-irctc-rupay", "SBI Card"),
        ],
      },
      {
        heading: "Axis Bank",
        items: [
          i("Axis Privilege Credit Card", "axis-privilege", "Axis Bank"),
          i("Axis Neo Credit Card", "axis-neo", "Axis Bank"),
          i("Axis My Wings Credit Card", "axis-my-wings", "Axis Bank"),
          i("Axis Magnus Credit Card", "axis-magnus", "Axis Bank"),
          i("Flipkart Axis Bank Credit Card", "axis-flipkart", "Axis Bank"),
          i("Axis ACE Credit Card", "axis-ace", "Axis Bank"),
          i("Axis MY ZONE Credit Card", "axis-my-zone", "Axis Bank"),
        ],
      },
      {
        heading: "IndusInd Bank",
        items: [
          i("Legend Credit Card", "indusind-legend", "IndusInd Bank"),
          i("Pinnacle Credit Card", "indusind-pinnacle", "IndusInd Bank"),
          i("Nexxt Credit Card", "indusind-nexxt", "IndusInd Bank"),
          i("Platinum RuPay Credit Card", "indusind-platinum-rupay", "IndusInd Bank"),
          i("EazyDiner Platinum Credit Card", "indusind-eazydiner", "IndusInd Bank"),
          i("Aura Edge Credit Card", "indusind-aura-edge", "IndusInd Bank"),
        ],
      },
      {
        heading: "More Issuers",
        items: [
          i("BOBCARD EASY Credit Card", "bobcard-easy", "BOBCARD"),
          i("BOBCARD ETERNA Credit Card", "bobcard-eterna", "BOBCARD"),
          i("HSBC Visa Platinum Card", "hsbc-visa-platinum", "HSBC Bank"),
          i("HSBC Live+ Credit Card", "hsbc-live-plus", "HSBC Bank"),
          i("AU LIT Credit Card", "au-lit", "AU Small Finance Bank"),
          i("AU Zenith Credit Card", "au-zenith", "AU Small Finance Bank"),
          i("Federal Visa Imperio Card", "federal-visa-imperio", "Federal Bank"),
        ],
      },
      {
        heading: "Loan on Credit Card",
        enquirySlug: "personal-loan",
        items: [
          i("HDFC Bank Credit Card Loan", "loan-hdfc-credit-card", "HDFC Bank"),
          i("ICICI Bank Credit Card Loan", "loan-icici-credit-card", "ICICI Bank"),
          i("Axis Bank Credit Card Loan", "loan-axis-credit-card", "Axis Bank"),
          i("SBI Credit Card Loan", "loan-sbi-credit-card", "SBI Card"),
          i("Bajaj Insta EMI Card", "bajaj-insta-emi-card", "Bajaj Finserv"),
          i("HDFC Insta Loan", "hdfc-insta-loan", "HDFC Bank"),
        ],
      },
    ],
  },

  {
    key: "personal-loan",
    kind: "loan",
    label: "Personal Loans",
    navLabel: "Personal Loan",
    tagline: "Unsecured funding for weddings, travel, medical needs and debt consolidation.",
    enquirySlug: "personal-loan",
    facts: [
      { label: "Loan amount", value: "₹10K – ₹40L" },
      { label: "Interest rate", value: "From 10.25% p.a." },
      { label: "Tenure", value: "12 – 72 months" },
      { label: "Disbursal", value: "As fast as 24 hrs" },
    ],
    columns: [
      {
        heading: "Top Lenders",
        items: [
          i("Best Personal Loan Lenders", "best-lenders"),
          i("HDFC Bank Personal Loan", "hdfc", "HDFC Bank"),
          i("Kotak Personal Loan", "kotak", "Kotak Mahindra Bank"),
          i("Moneyview Personal Loan", "moneyview", "Moneyview"),
          i("Poonawalla Personal Loan", "poonawalla", "Poonawalla Fincorp"),
          i("InCred Personal Loan", "incred", "InCred"),
          i("L&T Finance Personal Loan", "lnt-finance", "L&T Finance"),
          i("FlexSalary Personal Loan", "flexsalary", "FlexSalary"),
        ],
      },
      {
        heading: "By Loan Amount",
        items: [
          i("₹10,000 Personal Loan", "10000"),
          i("₹20,000 Personal Loan", "20000"),
          i("₹50,000 Personal Loan", "50000"),
          i("₹1 Lakh Personal Loan", "1-lakh"),
          i("₹2 Lakh Personal Loan", "2-lakh"),
          i("₹3 Lakh Personal Loan", "3-lakh"),
          i("₹5 Lakh Personal Loan", "5-lakh"),
          i("₹10 Lakh Personal Loan", "10-lakh"),
          i("₹15 Lakh Personal Loan", "15-lakh"),
        ],
      },
      {
        heading: "Tools & Rates",
        items: [
          i("Personal Loan Interest Rates", "interest-rates"),
          i("Personal Loan EMI Calculator", "emi-calculator"),
          i("Eligibility Criteria", "eligibility"),
          i("Documents Required", "documents"),
        ],
      },
      {
        heading: "Overdraft Facility",
        enquirySlug: "working-capital",
        items: [
          i("ICICI Bank Insta OD", "icici-insta-od", "ICICI Bank"),
          i("Bajaj Overdraft Loan", "bajaj-overdraft", "Bajaj Finserv"),
          i("SBI Overdraft Facility", "sbi-overdraft", "SBI"),
          i("HDFC Overdraft Facility", "hdfc-overdraft", "HDFC Bank"),
          i("Kotak Overdraft Loan", "kotak-overdraft", "Kotak Mahindra Bank"),
          i("Dropline Overdraft", "dropline-overdraft"),
        ],
      },
    ],
  },

  {
    key: "business-loan",
    kind: "loan",
    label: "Business Loans",
    navLabel: "Business Loan",
    tagline: "Working capital, term loans and government schemes for MSMEs and enterprises.",
    enquirySlug: "business-loan",
    facts: [
      { label: "Loan amount", value: "₹50K – ₹75L" },
      { label: "Interest rate", value: "From 14% p.a." },
      { label: "Tenure", value: "12 – 60 months" },
      { label: "Collateral", value: "Unsecured options" },
    ],
    columns: [
      {
        heading: "Top Lenders",
        items: [
          i("Best Business Loan Lenders", "best-lenders"),
          i("Poonawalla Business Loan", "poonawalla", "Poonawalla Fincorp"),
          i("Lendingkart Business Loan", "lendingkart", "Lendingkart"),
          i("Protium Business Loan", "protium", "Protium"),
          i("ICICI Business Loan", "icici", "ICICI Bank"),
          i("Kotak Business Loan", "kotak", "Kotak Mahindra Bank"),
          i("SBI Business Loan", "sbi", "SBI"),
          i("Bank of Baroda Business Loan", "bob", "Bank of Baroda"),
        ],
      },
      {
        heading: "Government Schemes",
        items: [
          i("MUDRA Loan", "mudra-loan"),
          i("SBI e-Mudra Loan", "sbi-e-mudra", "SBI"),
          i("CGTMSE Scheme", "cgtmse-scheme"),
          i("PMEGP Loan", "pmegp-loan"),
          i("PSB Loans in 59 Minutes", "psb-59-minutes"),
          i("PM Vishwakarma Yojana", "pm-vishwakarma-yojana"),
          i("PMFME Loan", "pmfme-loan"),
        ],
      },
      {
        heading: "Tools & Guides",
        items: [
          i("Business Loan EMI Calculator", "emi-calculator"),
          i("Eligibility Criteria", "eligibility"),
          i("Documents Required", "documents"),
          i("Interest Rates Compared", "interest-rates"),
        ],
      },
    ],
  },

  {
    key: "home-loan",
    kind: "loan",
    label: "Home Loans",
    navLabel: "Home Loan",
    tagline: "Finance your home purchase, construction or transfer at competitive rates.",
    enquirySlug: "home-loan",
    facts: [
      { label: "Loan amount", value: "Up to ₹5 Cr" },
      { label: "Interest rate", value: "From 8.35% p.a." },
      { label: "Tenure", value: "Up to 30 years" },
      { label: "LTV", value: "Up to 90%" },
    ],
    columns: [
      {
        heading: "Top Lenders",
        items: [
          i("HDFC Bank Home Loan", "hdfc", "HDFC Bank"),
          i("Kotak Bank Home Loan", "kotak", "Kotak Mahindra Bank"),
          i("IDFC First Home Loan", "idfc-first", "IDFC First Bank"),
          i("PNB Housing Home Loan", "pnb-housing", "PNB Housing Finance"),
          i("Federal Bank Home Loan", "federal", "Federal Bank"),
          i("L&T Home Loan", "lnt", "L&T Housing Finance"),
          i("Home First Home Loan", "home-first", "Home First Finance"),
          i("Shubham Finance Home Loan", "shubham", "Shubham Housing Finance"),
        ],
      },
      {
        heading: "By Loan Amount",
        items: [
          i("₹15 Lakh Home Loan", "15-lakh"),
          i("₹20 Lakh Home Loan", "20-lakh"),
          i("₹25 Lakh Home Loan", "25-lakh"),
          i("₹30 Lakh Home Loan", "30-lakh"),
          i("₹40 Lakh Home Loan", "40-lakh"),
          i("₹50 Lakh Home Loan", "50-lakh"),
          i("₹75 Lakh Home Loan", "75-lakh"),
          i("₹1 Crore Home Loan", "1-crore"),
        ],
      },
      {
        heading: "Balance Transfer",
        items: [
          i("HDFC Home Loan Balance Transfer", "bt-hdfc", "HDFC Bank"),
          i("Kotak Home Loan Balance Transfer", "bt-kotak", "Kotak Mahindra Bank"),
          i("IDFC First Balance Transfer", "bt-idfc-first", "IDFC First Bank"),
          i("Home First Balance Transfer", "bt-home-first", "Home First Finance"),
        ],
      },
      {
        heading: "Loan Against Property",
        enquirySlug: "loan-against-property",
        items: [
          i("HDFC Loan Against Property", "lap-hdfc", "HDFC Bank"),
          i("Kotak Loan Against Property", "lap-kotak", "Kotak Mahindra Bank"),
          i("Federal Loan Against Property", "lap-federal", "Federal Bank"),
          i("IDFC First Loan Against Property", "lap-idfc-first", "IDFC First Bank"),
          i("Shubham Loan Against Property", "lap-shubham", "Shubham Housing Finance"),
        ],
      },
      {
        heading: "Tools & Rates",
        items: [
          i("Best Home Loan Interest Rates", "interest-rates"),
          i("Home Loan EMI Calculator", "emi-calculator"),
          i("Eligibility Criteria", "eligibility"),
          i("Documents Required", "documents"),
        ],
      },
    ],
  },
];

export const CATEGORY_BY_KEY: Record<string, CatalogCategory> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c]),
);

export function itemsFor(category: CatalogCategory): CatalogItem[] {
  return category.columns.flatMap((col) => col.items);
}

/** Enquiry product slug for a specific item (column override wins). */
export function enquirySlugFor(category: CatalogCategory, slug: string): string {
  for (const column of category.columns) {
    if (column.items.some((it) => it.slug === slug)) {
      return column.enquirySlug ?? category.enquirySlug;
    }
  }
  return category.enquirySlug;
}

export function findItem(
  categoryKey: string,
  slug: string,
): { category: CatalogCategory; column: CatalogColumn; item: CatalogItem } | null {
  const category = CATEGORY_BY_KEY[categoryKey];
  if (!category) return null;
  for (const column of category.columns) {
    const item = column.items.find((it) => it.slug === slug);
    if (item) return { category, column, item };
  }
  return null;
}

export function allProductParams(): { category: string; item: string }[] {
  return CATEGORIES.flatMap((c) => itemsFor(c).map((it) => ({ category: c.key, item: it.slug })));
}
