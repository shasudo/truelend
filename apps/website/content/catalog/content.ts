import raw from "./content.json";

export type Fact = { label: string; value: string };
export type Faq = { q: string; a: string };

export type ItemContent = {
  summary?: string;
  facts?: Fact[];
  features?: string[];
  rewards?: Fact[];
  eligibility?: string[];
  documents?: string[];
  fees?: Fact[];
  faqs?: Faq[];
  sourceUrl?: string;
  partial?: boolean;
};

const DATA = raw as Record<string, Record<string, ItemContent>>;

export function contentFor(categoryKey: string, slug: string): ItemContent | null {
  return DATA[categoryKey]?.[slug] ?? null;
}
