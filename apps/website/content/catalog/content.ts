import { CATEGORIES, itemsFor } from "@truelend/reference";
import { z } from "zod";
import raw from "./content.json";

const nonEmptyText = z.string().trim().min(1);
const factSchema = z.object({ label: nonEmptyText, value: nonEmptyText }).strict();
const faqSchema = z.object({ q: nonEmptyText, a: nonEmptyText }).strict();
const itemContentSchema = z
  .object({
    summary: nonEmptyText.optional(),
    facts: z.array(factSchema).optional(),
    features: z.array(nonEmptyText).optional(),
    rewards: z.array(factSchema).optional(),
    eligibility: z.array(nonEmptyText).optional(),
    documents: z.array(nonEmptyText).optional(),
    fees: z.array(factSchema).optional(),
    faqs: z.array(faqSchema).optional(),
    sourceUrl: z.url().optional(),
    partial: z.boolean().optional(),
  })
  .strict();

const catalogContentSchema = z.record(z.string(), z.record(z.string(), itemContentSchema));

export type Fact = z.infer<typeof factSchema>;
export type Faq = z.infer<typeof faqSchema>;
export type ItemContent = z.infer<typeof itemContentSchema>;

// These taxonomy pages deliberately use the category-level guidance. Keeping
// the exceptions explicit makes every new catalog item choose rich content or
// an intentional fallback instead of silently shipping an empty page.
export const catalogFallbackOnlyKeys = new Set([
  "personal-loan/eligibility",
  "personal-loan/documents",
  "business-loan/eligibility",
  "business-loan/documents",
  "business-loan/interest-rates",
  "home-loan/eligibility",
  "home-loan/documents",
]);

const DATA = catalogContentSchema.parse(raw);
const taxonomyKeys = new Set(
  CATEGORIES.flatMap((category) =>
    itemsFor(category).map((item) => `${category.key}/${item.slug}`),
  ),
);
const contentKeys = new Set(
  Object.entries(DATA).flatMap(([category, entries]) =>
    Object.keys(entries).map((slug) => `${category}/${slug}`),
  ),
);
const missing = [...taxonomyKeys].filter(
  (key) => !contentKeys.has(key) && !catalogFallbackOnlyKeys.has(key),
);
const unknown = [...contentKeys].filter((key) => !taxonomyKeys.has(key));
const completedFallbacks = [...catalogFallbackOnlyKeys].filter((key) => contentKeys.has(key));

if (missing.length || unknown.length || completedFallbacks.length) {
  throw new Error(
    [
      missing.length ? `missing content: ${missing.join(", ")}` : "",
      unknown.length ? `unknown content: ${unknown.join(", ")}` : "",
      completedFallbacks.length
        ? `remove completed fallback exceptions: ${completedFallbacks.join(", ")}`
        : "",
    ]
      .filter(Boolean)
      .join("; "),
  );
}

export function contentFor(categoryKey: string, slug: string): ItemContent | null {
  return DATA[categoryKey]?.[slug] ?? null;
}
