import type { LucideIcon } from "lucide-react";
import type { BankSlug, ProductSlug } from "@truelend/reference";

export interface RateRow {
  bankSlug: BankSlug;
  /** % p.a. range — rendered with tabular numerals. */
  interestRate: { min: number; max: number };
  /** Display string, e.g. "Up to 0.50%". */
  processingFee: string;
  maxTenureYears: number;
  /** Display string, e.g. "₹5 Cr". */
  maxAmount?: string;
}

export interface ProductCategory {
  slug: ProductSlug;
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
