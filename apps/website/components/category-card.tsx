import Image from "next/image";
import Link from "next/link";
import { MoveUpRight } from "lucide-react";
import { Card } from "@truelend/ui";
import type { ProductCategory } from "@/content/types";
import { minRateLabel } from "@/lib/format";

export function CategoryCard({ product }: { product: ProductCategory }) {
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
            className="object-cover object-center saturate-[0.45] transition-all duration-300 group-hover:scale-[1.03] group-hover:saturate-100"
          />
          {/* Stock photos come from different shoots, eras and lighting. Holding
              saturation down and multiplying a flat brand tint over the top is
              what makes them read as one set; without it the greens and reds in
              the card/vehicle shots fight the rest of the grid. Drop the
              treatment only if every image is reshot to a single art brief. */}
          <div aria-hidden className="absolute inset-0 bg-navy-950/45 mix-blend-multiply" />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-navy-950/70 via-navy-950/10 to-transparent"
          />
          <span className="absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center rounded-lg bg-paper/90 text-navy-800 backdrop-blur-sm transition-colors group-hover:bg-red-50 group-hover:text-red-600">
            <Icon className="h-4.5 w-4.5" aria-hidden />
          </span>
        </div>
        <h3 className="mt-4 px-6 font-display text-lg font-bold text-navy-950">{product.name}</h3>
        <p className="mt-1.5 px-6 text-sm leading-relaxed text-navy-600">{product.tagline}</p>
        <span className="mt-auto flex items-center justify-between px-6 pb-6 pt-5 text-sm">
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
