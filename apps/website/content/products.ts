import {
  Home,
  Building2,
  Briefcase,
  User,
  Car,
  GraduationCap,
  IndianRupee,
  Tractor,
  CreditCard,
} from "lucide-react";
import type { ProductCategory } from "./types";

// RATES_ARE_PLACEHOLDER: these indicative numbers still require approved,
// sourced product data before production.

export const products: ProductCategory[] = [
  {
    slug: "home-loan",
    name: "Home Loan",
    shortName: "Home",
    icon: Home,
    image: "/images/products/home-loan.avif",
    tagline: "Turn a dream home into reality.",
    description:
      "Buying, building or renovating — we compare home loan offers across banks and NBFCs on rate, processing fee, LTV and turnaround, and take your file to the lender whose credit policy actually fits your profile.",
    highlights: [
      { label: "Rates from", value: "8.35% p.a." },
      { label: "Tenure up to", value: "30 yrs" },
      { label: "Funding up to", value: "90% LTV" },
    ],
    rates: [
      {
        bankSlug: "sbi",
        interestRate: { min: 8.35, max: 9.15 },
        processingFee: "Up to 0.35%",
        maxTenureYears: 30,
        maxAmount: "₹10 Cr",
      },
      {
        bankSlug: "hdfc",
        interestRate: { min: 8.4, max: 9.4 },
        processingFee: "Up to 0.50%",
        maxTenureYears: 30,
        maxAmount: "₹10 Cr",
      },
      {
        bankSlug: "icici",
        interestRate: { min: 8.45, max: 9.45 },
        processingFee: "Up to 0.50%",
        maxTenureYears: 30,
        maxAmount: "₹5 Cr",
      },
      {
        bankSlug: "axis",
        interestRate: { min: 8.5, max: 9.6 },
        processingFee: "Up to 0.50%",
        maxTenureYears: 30,
        maxAmount: "₹5 Cr",
      },
      {
        bankSlug: "kotak",
        interestRate: { min: 8.55, max: 9.5 },
        processingFee: "Up to 0.50%",
        maxTenureYears: 25,
        maxAmount: "₹5 Cr",
      },
      {
        bankSlug: "bajaj",
        interestRate: { min: 8.6, max: 10.1 },
        processingFee: "Up to 1.00%",
        maxTenureYears: 30,
        maxAmount: "₹7.5 Cr",
      },
    ],
    eligibility: [
      "Salaried or self-employed, aged 21–65 at loan maturity",
      "Minimum income of ₹25,000/month (varies by city and lender)",
      "CIBIL score of 700+ for the best rates",
      "Property with clear, marketable title",
    ],
    documents: [
      "PAN and Aadhaar",
      "Last 3 months' salary slips or 2 years' ITR with financials",
      "6 months' bank statements",
      "Property documents (sale agreement, title chain, approvals)",
      "Passport-size photograph",
    ],
    faqs: [
      {
        q: "Fixed or floating — which should I choose?",
        a: "Most Indian home loans are floating, repo-linked, and reprice with the RBI cycle. Fixed makes sense only if you expect rates to rise sharply and are willing to pay the premium. We model both against your horizon before recommending.",
      },
      {
        q: "How much loan can I get?",
        a: "Lenders typically fund 75–90% of the property value, capped by your FOIR — roughly, EMIs up to 50–60% of net monthly income. We calculate your realistic eligibility across lenders before you shortlist a property.",
      },
      {
        q: "Can I get a balance transfer on my existing home loan?",
        a: "Yes. If your current rate is meaningfully above the market, a balance transfer plus top-up often pays for itself within a year. We check the switch economics — including fees — before recommending it.",
      },
      {
        q: "Does applying through TrueLend cost me anything?",
        a: "No. Our advisory is free for borrowers — we're compensated by the lender on successful disbursement, and we show you the same rate sheet the lender publishes.",
      },
    ],
  },
  {
    slug: "loan-against-property",
    name: "Loan Against Property",
    shortName: "LAP",
    icon: Building2,
    image: "/images/products/loan-against-property.avif",
    tagline: "Unlock the value in owned property.",
    description:
      "A loan against residential, commercial or industrial property gives you large-ticket funds at rates far below unsecured credit. We match your property profile and cash-flow story to the lender most likely to value both fairly.",
    highlights: [
      { label: "Rates from", value: "9.25% p.a." },
      { label: "Tenure up to", value: "15 yrs" },
      { label: "Funding up to", value: "70% LTV" },
    ],
    rates: [
      {
        bankSlug: "hdfc",
        interestRate: { min: 9.25, max: 11.0 },
        processingFee: "Up to 1.00%",
        maxTenureYears: 15,
        maxAmount: "₹7.5 Cr",
      },
      {
        bankSlug: "icici",
        interestRate: { min: 9.4, max: 11.25 },
        processingFee: "Up to 1.00%",
        maxTenureYears: 15,
        maxAmount: "₹5 Cr",
      },
      {
        bankSlug: "axis",
        interestRate: { min: 9.5, max: 11.5 },
        processingFee: "Up to 1.00%",
        maxTenureYears: 15,
        maxAmount: "₹5 Cr",
      },
      {
        bankSlug: "tata",
        interestRate: { min: 9.75, max: 12.0 },
        processingFee: "Up to 1.25%",
        maxTenureYears: 15,
        maxAmount: "₹5 Cr",
      },
      {
        bankSlug: "bajaj",
        interestRate: { min: 9.85, max: 12.25 },
        processingFee: "Up to 1.50%",
        maxTenureYears: 18,
        maxAmount: "₹10 Cr",
      },
    ],
    eligibility: [
      "Property owner (residential, commercial or industrial) with clear title",
      "Salaried, self-employed or business income to service the EMI",
      "Age 23–70 at loan maturity",
      "CIBIL score of 685+ preferred",
    ],
    documents: [
      "PAN and Aadhaar",
      "Income proof — ITRs, financials or salary slips",
      "12 months' bank statements",
      "Complete property title documents",
      "Existing loan statements, if any",
    ],
    faqs: [
      {
        q: "How is LAP different from a home loan?",
        a: "A home loan funds the purchase of the property itself; LAP borrows against a property you already own, and the funds are free-use — business expansion, education, consolidation. Rates are slightly higher and LTVs lower.",
      },
      {
        q: "What property types qualify?",
        a: "Self-occupied or rented residential and commercial property, and in many cases industrial property or plots. Lender appetite varies sharply by property type and location — that's exactly the matching we do.",
      },
      {
        q: "How much can I raise?",
        a: "Typically 50–70% of the market valuation, subject to income. Valuations differ between lenders by 10–15% for the same property, so choosing the lender first matters.",
      },
      {
        q: "How long does disbursement take?",
        a: "Two to three weeks is typical — legal and technical verification of the property is the long pole. Complete documents up front shorten it materially.",
      },
    ],
  },
  {
    slug: "business-loan",
    name: "Business Loan",
    shortName: "Business",
    icon: Briefcase,
    image: "/images/products/business-loan.avif",
    tagline: "Fuel business growth and expansion.",
    description:
      "Unsecured business loans for proprietors, partnerships and private limited companies — no collateral, quick sanction. We position your turnover, margins and banking behaviour to the lender whose credit model rewards them.",
    highlights: [
      { label: "Rates from", value: "14% p.a." },
      { label: "Ticket up to", value: "₹75 L" },
      { label: "Sanction in", value: "3–5 days" },
    ],
    rates: [
      {
        bankSlug: "hdfc",
        interestRate: { min: 14.0, max: 21.0 },
        processingFee: "Up to 2.00%",
        maxTenureYears: 4,
        maxAmount: "₹50 L",
      },
      {
        bankSlug: "icici",
        interestRate: { min: 14.5, max: 22.0 },
        processingFee: "Up to 2.00%",
        maxTenureYears: 5,
        maxAmount: "₹50 L",
      },
      {
        bankSlug: "kotak",
        interestRate: { min: 15.0, max: 22.5 },
        processingFee: "Up to 2.00%",
        maxTenureYears: 4,
        maxAmount: "₹40 L",
      },
      {
        bankSlug: "bajaj",
        interestRate: { min: 15.5, max: 24.0 },
        processingFee: "Up to 2.50%",
        maxTenureYears: 5,
        maxAmount: "₹75 L",
      },
      {
        bankSlug: "tata",
        interestRate: { min: 15.75, max: 23.5 },
        processingFee: "Up to 2.50%",
        maxTenureYears: 4,
        maxAmount: "₹60 L",
      },
    ],
    eligibility: [
      "Business vintage of 3+ years with profitable operations",
      "Minimum annual turnover of ₹40 L (varies by lender)",
      "CIBIL score of 700+ and clean repayment track",
      "Business registration / GST as applicable",
    ],
    documents: [
      "PAN and Aadhaar of promoters",
      "GST returns and registration",
      "2 years' ITR with audited financials",
      "12 months' current-account statements",
      "Business continuity proof (registration, licences)",
    ],
    faqs: [
      {
        q: "Do I need collateral?",
        a: "No — these are unsecured loans priced on your business's cash flows and credit history. If you can offer property, a secured working-capital line or LAP will cost several points less; we'll show both options.",
      },
      {
        q: "Why do lenders quote such different rates?",
        a: "Each lender's model weighs industry, turnover, margins and banking hygiene differently. The same file can be priced 5% apart between two lenders — matching the profile to the model is most of the value we add.",
      },
      {
        q: "How fast can funds arrive?",
        a: "For a complete file, sanction typically lands in 3–5 working days and disbursement within a week. Digital-first NBFCs can be faster for smaller tickets.",
      },
      {
        q: "Can I prepay?",
        a: "Most lenders allow prepayment after 6–12 EMIs with a 2–4% foreclosure charge. If early exit is likely, we shortlist lenders with the softest prepayment terms.",
      },
    ],
  },
  {
    slug: "personal-loan",
    name: "Personal Loan",
    shortName: "Personal",
    icon: User,
    image: "/images/products/personal-loan.avif",
    tagline: "Quick funds for personal needs.",
    description:
      "Weddings, medical needs, travel, consolidation — an unsecured personal loan is the fastest formal credit available. Your employer category, income and score decide your rate; we route your file where those numbers score best.",
    highlights: [
      { label: "Rates from", value: "10.5% p.a." },
      { label: "Ticket up to", value: "₹40 L" },
      { label: "Disbursal in", value: "24–48 hrs" },
    ],
    rates: [
      {
        bankSlug: "hdfc",
        interestRate: { min: 10.5, max: 16.5 },
        processingFee: "Up to 1.50%",
        maxTenureYears: 6,
        maxAmount: "₹40 L",
      },
      {
        bankSlug: "icici",
        interestRate: { min: 10.75, max: 16.25 },
        processingFee: "Up to 1.50%",
        maxTenureYears: 6,
        maxAmount: "₹50 L",
      },
      {
        bankSlug: "axis",
        interestRate: { min: 10.9, max: 17.0 },
        processingFee: "Up to 1.75%",
        maxTenureYears: 5,
        maxAmount: "₹40 L",
      },
      {
        bankSlug: "kotak",
        interestRate: { min: 10.99, max: 17.5 },
        processingFee: "Up to 2.00%",
        maxTenureYears: 5,
        maxAmount: "₹35 L",
      },
      {
        bankSlug: "indusind",
        interestRate: { min: 11.0, max: 18.0 },
        processingFee: "Up to 2.00%",
        maxTenureYears: 5,
        maxAmount: "₹30 L",
      },
      {
        bankSlug: "bajaj",
        interestRate: { min: 11.25, max: 18.5 },
        processingFee: "Up to 2.50%",
        maxTenureYears: 6,
        maxAmount: "₹35 L",
      },
    ],
    eligibility: [
      "Salaried with ₹25,000+ net monthly income, or self-employed with stable ITRs",
      "Age 21–60 at loan maturity",
      "CIBIL score of 720+ for the sharpest pricing",
      "6+ months in current employment",
    ],
    documents: [
      "PAN and Aadhaar",
      "Last 3 months' salary slips",
      "3–6 months' bank statements",
      "Passport-size photograph",
    ],
    faqs: [
      {
        q: "What decides my personal loan rate?",
        a: "Employer category, net income, existing obligations and CIBIL score. A category-A employer with a 750+ score can be priced 5–6% below the same income at an unlisted firm — which is why lender choice matters more than negotiation.",
      },
      {
        q: "Will checking offers hurt my credit score?",
        a: "Multiple hard enquiries in a short window do. Through TrueLend, your profile is evaluated against lender policies before any application is filed, so you apply once, where approval is most likely.",
      },
      {
        q: "Should I consolidate credit-card dues into a personal loan?",
        a: "Usually yes — card revolving credit costs 36–42% annualised against 11–16% on a personal loan. We run the math including fees before recommending it.",
      },
      {
        q: "How fast is disbursal?",
        a: "Pre-approved profiles see same-day credit; fresh files typically clear in 24–48 hours once documents are complete.",
      },
    ],
  },
  {
    slug: "vehicle-loan",
    name: "Vehicle Loan",
    shortName: "Vehicle",
    icon: Car,
    image: "/images/products/vehicle-loan.avif",
    tagline: "Finance the right car or vehicle.",
    description:
      "New cars, used cars and commercial vehicles. Dealers push the financier that pays them most — we compare across banks and NBFCs so the financing is as good as the negotiation on the vehicle itself.",
    highlights: [
      { label: "Rates from", value: "8.70% p.a." },
      { label: "Funding up to", value: "100% on-road" },
      { label: "Tenure up to", value: "8 yrs" },
    ],
    rates: [
      {
        bankSlug: "sbi",
        interestRate: { min: 8.7, max: 9.8 },
        processingFee: "Up to ₹1,500",
        maxTenureYears: 8,
      },
      {
        bankSlug: "hdfc",
        interestRate: { min: 8.75, max: 10.5 },
        processingFee: "Up to 0.50%",
        maxTenureYears: 7,
      },
      {
        bankSlug: "icici",
        interestRate: { min: 8.8, max: 10.75 },
        processingFee: "Up to 0.50%",
        maxTenureYears: 7,
      },
      {
        bankSlug: "axis",
        interestRate: { min: 8.9, max: 11.0 },
        processingFee: "Up to 0.75%",
        maxTenureYears: 8,
      },
      {
        bankSlug: "kotak",
        interestRate: { min: 8.95, max: 11.25 },
        processingFee: "Up to 0.75%",
        maxTenureYears: 7,
      },
    ],
    eligibility: [
      "Salaried or self-employed with demonstrable income",
      "Age 21–65 at loan maturity",
      "CIBIL score of 700+ preferred",
      "Used vehicles: age of car + tenure typically within 10 years",
    ],
    documents: [
      "PAN and Aadhaar",
      "Income proof — salary slips or ITR",
      "3–6 months' bank statements",
      "Proforma invoice (new) or RC + valuation (used)",
    ],
    faqs: [
      {
        q: "Is the dealer's finance offer good enough?",
        a: "Sometimes — but dealers earn a payout from the financier, so the default offer optimises their commission, not your rate. A 30-minute comparison typically saves 0.5–1.5% on the same car.",
      },
      {
        q: "Can I get 100% funding?",
        a: "Several lenders fund 100% of the ex-showroom or even on-road price for strong profiles. Weaker profiles see 80–90%. We'll tell you which bracket you fall in before you book.",
      },
      {
        q: "Are used-car loans costlier?",
        a: "Yes, typically 2–4% above new-car rates, with valuation-based funding. NBFCs are more flexible on older vehicles; banks are cheaper on newer ones.",
      },
      {
        q: "What about commercial vehicles?",
        a: "CV finance is a specialised book — rates depend on the operator profile, route economics and fleet size. We work with lenders who understand first-time buyers as well as fleet operators.",
      },
    ],
  },
  {
    slug: "education-loan",
    name: "Education Loan",
    shortName: "Education",
    icon: GraduationCap,
    image: "/images/products/education-loan.avif",
    tagline: "Invest in a brighter future.",
    description:
      "Domestic and overseas education finance — with or without collateral. The right structure (moratorium, margin money, co-borrower, collateral choice) matters more here than anywhere else, and it varies wildly across lenders.",
    highlights: [
      { label: "Rates from", value: "8.50% p.a." },
      { label: "Ticket up to", value: "₹1.5 Cr" },
      { label: "Moratorium", value: "Course + 1 yr" },
    ],
    rates: [
      {
        bankSlug: "sbi",
        interestRate: { min: 8.5, max: 10.75 },
        processingFee: "Up to ₹10,000",
        maxTenureYears: 15,
        maxAmount: "₹1.5 Cr",
      },
      {
        bankSlug: "icici",
        interestRate: { min: 9.0, max: 12.0 },
        processingFee: "Up to 1.00%",
        maxTenureYears: 12,
        maxAmount: "₹1 Cr",
      },
      {
        bankSlug: "axis",
        interestRate: { min: 9.25, max: 12.25 },
        processingFee: "Up to 1.00%",
        maxTenureYears: 15,
        maxAmount: "₹75 L",
      },
      {
        bankSlug: "hdfc",
        interestRate: { min: 9.5, max: 12.5 },
        processingFee: "Up to 1.00%",
        maxTenureYears: 14,
        maxAmount: "₹1 Cr",
      },
    ],
    eligibility: [
      "Confirmed admission to a recognised institution (India or abroad)",
      "Co-borrower (parent/guardian) with stable income",
      "Collateral needed above ~₹7.5 L for most banks; NBFCs go higher unsecured",
      "Academic record considered for unsecured lending",
    ],
    documents: [
      "Admission letter and fee schedule",
      "PAN and Aadhaar of student and co-borrower",
      "Co-borrower income proof and bank statements",
      "Academic records (10th, 12th, degree)",
      "Collateral documents, if applicable",
    ],
    faqs: [
      {
        q: "Secured or unsecured — which is better?",
        a: "If collateral is available, secured loans cost 2–3% less and cover larger amounts. Unsecured works for top-ranked institutes where lenders trust future earnings. We compare both paths with actual numbers.",
      },
      {
        q: "When does repayment start?",
        a: "After a moratorium of the course period plus 6–12 months. Interest accrues during the moratorium — servicing even simple interest during study reduces the final burden significantly.",
      },
      {
        q: "Is there tax benefit?",
        a: "Yes — Section 80E allows deduction of the entire interest paid for up to 8 years, with no upper cap. It materially lowers the effective cost for earning co-borrowers.",
      },
      {
        q: "Do you handle overseas education?",
        a: "Yes — including lenders comfortable with living costs, exchange buffers and country-specific norms for the US, UK, Canada and Australia intakes.",
      },
    ],
  },
  {
    slug: "working-capital",
    name: "Working Capital",
    shortName: "Working Capital",
    icon: IndianRupee,
    image: "/images/products/working-capital.avif",
    tagline: "Breathing room for the operating cycle.",
    description:
      "Overdrafts, cash-credit limits and invoice-backed lines that flex with your receivables. Pay interest only on what you use, and renew annually — the cheapest way to fund inventory and debtors when structured right.",
    highlights: [
      { label: "Rates from", value: "9.50% p.a." },
      { label: "Limit up to", value: "₹10 Cr" },
      { label: "Interest on", value: "Utilised only" },
    ],
    rates: [
      {
        bankSlug: "sbi",
        interestRate: { min: 9.5, max: 12.0 },
        processingFee: "Up to 1.00%",
        maxTenureYears: 1,
        maxAmount: "₹10 Cr",
      },
      {
        bankSlug: "hdfc",
        interestRate: { min: 9.75, max: 12.5 },
        processingFee: "Up to 1.00%",
        maxTenureYears: 1,
        maxAmount: "₹7.5 Cr",
      },
      {
        bankSlug: "icici",
        interestRate: { min: 10.0, max: 13.0 },
        processingFee: "Up to 1.00%",
        maxTenureYears: 1,
        maxAmount: "₹5 Cr",
      },
      {
        bankSlug: "axis",
        interestRate: { min: 10.25, max: 13.5 },
        processingFee: "Up to 1.25%",
        maxTenureYears: 1,
        maxAmount: "₹5 Cr",
      },
    ],
    eligibility: [
      "Operating business with 3+ years' vintage",
      "Audited financials showing a genuine working-capital cycle",
      "Collateral or strong receivables cover, depending on structure",
      "Satisfactory banking conduct and account churn",
    ],
    documents: [
      "GST returns and registration",
      "2–3 years' audited financials with ITR",
      "12 months' bank statements across accounts",
      "Debtor/creditor ageing and stock statements",
      "Collateral documents where applicable",
    ],
    faqs: [
      {
        q: "OD vs CC vs term loan — what's the difference?",
        a: "A term loan gives a lump sum repaid by EMI; OD/CC gives a revolving limit against which you draw as needed and pay interest daily on the utilised amount. For funding inventory and receivables, revolving limits are almost always cheaper.",
      },
      {
        q: "What decides my limit?",
        a: "Your working-capital gap — roughly debtors plus stock minus creditors — assessed from financials and stock statements. Banks typically fund 75–80% of that gap.",
      },
      {
        q: "Is collateral mandatory?",
        a: "Traditional bank limits usually want property or liquid collateral. Fintech-style invoice financing and unsecured OD products exist at higher rates — useful as a bridge while we build your case for a bank limit.",
      },
      {
        q: "What happens at renewal?",
        a: "Limits are reviewed annually against fresh financials. Slipping turnover or poor account conduct can shrink the limit — we help you present the renewal file so that doesn't happen.",
      },
    ],
  },
  {
    slug: "equipment-finance",
    name: "Equipment Finance",
    shortName: "Equipment",
    icon: Tractor,
    image: "/images/products/equipment-finance.avif",
    tagline: "Fund machines that pay for themselves.",
    description:
      "Finance for construction equipment, medical devices, machine tools, printing and packaging lines — where the asset itself is the collateral and lender appetite is driven by the equipment's resale market.",
    highlights: [
      { label: "Rates from", value: "9.75% p.a." },
      { label: "Funding up to", value: "90% of cost" },
      { label: "Tenure up to", value: "7 yrs" },
    ],
    rates: [
      {
        bankSlug: "hdfc",
        interestRate: { min: 9.75, max: 12.0 },
        processingFee: "Up to 1.00%",
        maxTenureYears: 7,
      },
      {
        bankSlug: "kotak",
        interestRate: { min: 10.0, max: 12.5 },
        processingFee: "Up to 1.00%",
        maxTenureYears: 6,
      },
      {
        bankSlug: "tata",
        interestRate: { min: 10.25, max: 13.0 },
        processingFee: "Up to 1.25%",
        maxTenureYears: 7,
      },
      {
        bankSlug: "bajaj",
        interestRate: { min: 10.5, max: 13.25 },
        processingFee: "Up to 1.50%",
        maxTenureYears: 6,
      },
    ],
    eligibility: [
      "Business or professional practice with 2+ years' vintage",
      "Quotation/proforma from an approved OEM or dealer",
      "Financials able to absorb the EMI alongside existing obligations",
      "First-time buyers considered with stronger margins",
    ],
    documents: [
      "PAN, Aadhaar and business registration",
      "Equipment quotation or proforma invoice",
      "2 years' ITR with financials",
      "6–12 months' bank statements",
    ],
    faqs: [
      {
        q: "Loan or lease — which is better for equipment?",
        a: "Loans build ownership and suit long-life assets; leases preserve cash flow and suit fast-obsoleting technology. The tax treatment differs too — we'll model both against your usage horizon.",
      },
      {
        q: "How much margin money do I need?",
        a: "Typically 10–25% of the equipment cost. Established OEM equipment with a deep resale market attracts the lowest margins and best rates.",
      },
      {
        q: "Is used equipment financeable?",
        a: "Yes, selectively — subject to valuation and residual life. NBFCs are the primary market; expect lower LTVs and 1–2% higher pricing.",
      },
      {
        q: "Do doctors get special medical-equipment schemes?",
        a: "Yes — most lenders run professional-loan programmes for doctors with faster processing and better pricing on diagnostic and imaging equipment.",
      },
    ],
  },
  {
    slug: "credit-cards",
    name: "Credit Cards",
    shortName: "Cards",
    icon: CreditCard,
    image: "/images/products/credit-cards.avif",
    tagline: "Everyday convenience and flexibility.",
    description:
      "Cashback, travel, fuel, premium lounge access or a first-ever card — issuers price benefits for very specific spending patterns. We map your actual monthly spends to the card whose rewards you'll genuinely use.",
    highlights: [
      { label: "Joining fee from", value: "₹0" },
      { label: "Rewards up to", value: "5% back" },
      { label: "Approval in", value: "3–7 days" },
    ],
    rates: [],
    eligibility: [
      "Age 21+, salaried or self-employed",
      "Income criteria vary by card tier — entry cards from ₹15,000/month",
      "CIBIL score of 720+ for premium cards",
      "First-time users can start with secured (FD-backed) cards",
    ],
    documents: [
      "PAN and Aadhaar",
      "Income proof for unsecured cards",
      "Photograph — most issuers are fully digital (video-KYC)",
    ],
    faqs: [
      {
        q: "Which card is best?",
        a: "There is no universal best — a card that's excellent for travel spends is mediocre for groceries. We look at your top three spend categories and shortlist cards whose reward structure actually pays there.",
      },
      {
        q: "Do annual-fee cards ever make sense?",
        a: "Yes, when the benefits you'll actually use — lounge access, milestone vouchers, accelerated rewards — exceed the fee. If they don't, a lifetime-free card wins. We do this arithmetic before recommending.",
      },
      {
        q: "Will a new card affect my credit score?",
        a: "A hard enquiry dips the score a few points temporarily; a well-managed card improves it long-term by adding history and lowering utilisation. Keep utilisation under 30% of the limit.",
      },
      {
        q: "I've never had credit — can I still get a card?",
        a: "Yes — secured cards against a fixed deposit need no credit history and build your score within 6–12 months, opening the door to regular cards and better loan pricing later.",
      },
    ],
  },
];

const loanProductDisplayOrder = [
  "personal-loan",
  "home-loan",
  "business-loan",
  "loan-against-property",
  "credit-cards",
  "education-loan",
  "vehicle-loan",
  "working-capital",
  "equipment-finance",
];

export const loanProductCards = loanProductDisplayOrder
  .map((slug) => products.find((product) => product.slug === slug))
  .filter((product): product is ProductCategory => Boolean(product));

export const productBySlug = (slug: string) => products.find((p) => p.slug === slug);
