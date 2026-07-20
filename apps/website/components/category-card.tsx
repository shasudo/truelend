import Image from "next/image";
import Link from "next/link";
import { MoveUpRight } from "lucide-react";
import { Card } from "@truelend/ui";
import type { ProductCategory } from "@/content/types";
import { minRateLabel } from "@/lib/format";

export interface CategoryCardProps {
  product: ProductCategory;
  name?: string;
  tagline?: string;
  showRate?: boolean;
  centered?: boolean;
}

export function CategoryCard({
  product,
  name = product.name,
  tagline = product.tagline,
  showRate = true,
  centered = false,
}: CategoryCardProps) {
  const Icon = product.icon;
  return (
    <Link href={`/products/${product.slug}`} className="group block h-full">
      <Card className="flex h-full flex-col overflow-hidden transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-navy-800/35 group-hover:shadow-[0_8px_30px_-12px_rgba(20,32,74,0.25)]">
        <div className="relative aspect-[3/2] overflow-hidden border-b border-hairline">
          {/* Photo is decorative — the heading below already names the product. */}
          <Image
            src={product.image}
            alt=""
            fill
            sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, calc(100vw - 40px)"
            className="object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
          />
          <span className="absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center rounded-lg bg-paper/90 text-navy-800 backdrop-blur-sm transition-colors group-hover:bg-red-50 group-hover:text-red-600">
            <Icon className="h-4.5 w-4.5" aria-hidden />
          </span>
        </div>
        <h3
          className={`mt-5 px-6 font-display font-bold text-navy-950 ${centered ? "text-center text-xl" : "text-lg"}`}
        >
          {name}
        </h3>
        <p
          className={`mt-1.5 px-6 text-sm leading-relaxed text-navy-600 ${centered ? "text-center" : ""}`}
        >
          {tagline}
        </p>
        <span
          className={`mt-auto flex items-center px-6 pb-6 pt-5 text-sm ${centered ? "justify-center gap-2" : "justify-between"}`}
        >
          {showRate ? (
            <span className="font-semibold tabular-nums text-navy-800">
              {minRateLabel(product)}
              <sup aria-hidden className="ml-0.5 font-normal text-red-600">
                *
              </sup>
            </span>
          ) : (
            <span className="font-semibold text-red-600">Learn more</span>
          )}
          <MoveUpRight
            aria-hidden
            strokeWidth={4}
            className="h-4 w-4 text-red-600 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </span>
      </Card>
    </Link>
  );
}
