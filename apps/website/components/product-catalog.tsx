import Link from "next/link";
import { ArrowUpRight, MoveUpRight } from "lucide-react";
import { Container } from "@truelend/ui";
import { CATEGORIES, type CatalogCategory } from "@truelend/reference";

interface CategoryBlockProps {
  category: CatalogCategory;
}

function CategoryBlock({ category }: CategoryBlockProps) {
  return (
    <div className="border-t border-hairline pt-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl">
          <Link
            href={`/products/all/${category.key}`}
            className="group inline-flex items-center gap-1.5 font-display text-2xl font-bold text-navy-950 hover:text-red-600"
          >
            {category.label}
            <MoveUpRight
              className="h-4 w-4 text-muted transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-red-600"
              aria-hidden
            />
          </Link>
          <p className="mt-2 text-sm leading-relaxed text-navy-600">{category.tagline}</p>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4 lg:shrink-0">
          {category.facts.map((f) => (
            <div key={f.label}>
              <dt className="text-xs font-medium text-muted">{f.label}</dt>
              <dd className="font-display text-sm font-bold tabular-nums text-navy-900">
                {f.value}
                <sup aria-hidden className="ml-0.5 font-normal text-red-600">
                  *
                </sup>
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-7 grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
        {category.columns.map((col) => (
          <div key={col.heading}>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-600">
              {col.heading}
            </p>
            <ul className="mt-3 space-y-1">
              {col.items.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={`/products/all/${category.key}/${item.slug}`}
                    className="group flex items-center gap-1 rounded py-1 text-sm text-navy-700 transition-colors hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                  >
                    <span>{item.label}</span>
                    <ArrowUpRight
                      aria-hidden
                      className="h-3.5 w-3.5 shrink-0 text-muted opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-red-600 group-hover:opacity-100"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProductCatalog() {
  return (
    <section aria-labelledby="browse-all-title" className="bg-paper-deep/40">
      <Container className="py-16 sm:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-600">
            Browse all products
          </p>
          <h2 id="browse-all-title" className="mt-2 font-display text-3xl font-bold text-navy-950">
            Every loan and card, compared
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-navy-600">
            Open any product for indicative rates, fees, eligibility and documents — then start a
            single enquiry and an advisor compares live offers across banks and NBFCs.
          </p>
        </div>

        <div className="mt-12 space-y-12">
          {CATEGORIES.map((category) => (
            <CategoryBlock key={category.key} category={category} />
          ))}
        </div>

        <p className="mt-12 max-w-3xl text-xs leading-relaxed text-muted">
          * Figures marked with an asterisk are indicative — set by lenders, compiled from public
          sources, and change with the market and your profile. They are not an offer; your advisor
          confirms live terms with the lender before any application.
        </p>
      </Container>
    </section>
  );
}
