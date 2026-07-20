import type { LucideIcon } from "lucide-react";

export interface Bank {
  slug: string;
  name: string;
  kind: "bank" | "nbfc";
}

export interface RateRow {
  bankSlug: string;
  /** % p.a. range — rendered with tabular numerals. */
  interestRate: { min: number; max: number };
  /** Display string, e.g. "Up to 0.50%". */
  processingFee: string;
  maxTenureYears: number;
  /** Display string, e.g. "₹5 Cr". */
  maxAmount?: string;
}

export interface ProductCategory {
  slug: string;
  name: string;
  shortName: string;
  icon: LucideIcon;
  /** Decorative card image under public/images/products. */
  image: string;
  tagline: string;
  description: string;
  /** Key facts rendered as oversized ledger numerals. */
  highlights: { label: string; value: string }[];
  /** Empty array = no bank-wise rate table (e.g. credit cards). */
  rates: RateRow[];
  eligibility: string[];
  documents: string[];
  faqs: { q: string; a: string }[];
}
