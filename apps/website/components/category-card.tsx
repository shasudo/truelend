import Link from "next/link";
import { MoveUpRight } from "lucide-react";
import { Card } from "@truelend/ui";
import type { ProductCategory } from "@/content/types";
import { minRateLabel } from "@/lib/format";

export function CategoryCard({ product }: { product: ProductCategory }) {
  const Icon = product.icon;
  return (
    <Link href={`/products/${product.slug}`} className="group block h-full">
      <Card className="flex h-full flex-col p-6 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-navy-800/35 group-hover:shadow-[0_8px_30px_-12px_rgba(20,32,74,0.25)]">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-navy-800/[0.06] text-navy-800 transition-colors group-hover:bg-red-50 group-hover:text-red-600">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <h3 className="mt-4 font-display text-lg font-bold text-navy-950">{product.name}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-navy-600">{product.tagline}</p>
        <span className="mt-auto flex items-center justify-between pt-5 text-sm">
          <span className="font-semibold tabular-nums text-navy-800">
            {minRateLabel(product)}
            <sup aria-hidden className="ml-0.5 font-normal text-red-600">
              *
            </sup>
          </span>
          <MoveUpRight
            aria-hidden
            className="h-4 w-4 text-muted transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-red-600"
          />
        </span>
      </Card>
    </Link>
  );
}
