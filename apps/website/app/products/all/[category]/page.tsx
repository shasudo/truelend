import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogCategoryView } from "@/components/catalog-view";
import { CATEGORIES, CATEGORY_BY_KEY } from "@/content/catalog/data";
import { canonical } from "@/lib/metadata";

export const dynamicParams = false;

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.key }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const cat = CATEGORY_BY_KEY[(await params).category];
  if (!cat) return {};
  const url = canonical(`/products/all/${cat.key}`);
  return {
    title: cat.label,
    description: cat.tagline,
    alternates: { canonical: url },
  };
}

export default async function CatalogCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const cat = CATEGORY_BY_KEY[(await params).category];
  if (!cat) notFound();
  return <CatalogCategoryView category={cat} />;
}
