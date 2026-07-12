import type { Bank } from "./types";

export const banks: Bank[] = [
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

export const bankName = (slug: string) => banks.find((b) => b.slug === slug)?.name ?? slug;
