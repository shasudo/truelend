import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogItemView } from "@/components/catalog-view";
import { contentFor } from "@/content/catalog/content";
import { allProductParams, findItem } from "@/content/catalog/data";
import { canonical, completeDescription } from "@/lib/metadata";

export const dynamicParams = false;

export function generateStaticParams() {
  return allProductParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; item: string }>;
}): Promise<Metadata> {
  const { category, item } = await params;
  const found = findItem(category, item);
  if (!found) return {};
  const summary = contentFor(category, item)?.summary;
  const url = canonical(`/products/all/${category}/${item}`);
  return {
    title: found.item.label,
    description: completeDescription(
      summary ??
        `${found.item.label} — compare details and apply with TrueLend's guided assistance.`,
    ),
    alternates: { canonical: url },
  };
}

export default async function CatalogItemPage({
  params,
}: {
  params: Promise<{ category: string; item: string }>;
}) {
  const { category, item } = await params;
  const found = findItem(category, item);
  if (!found) notFound();
  return <CatalogItemView category={found.category} column={found.column} item={found.item} />;
}
