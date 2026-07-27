import Link from "next/link";
import { ChevronDown, MoveUpRight } from "lucide-react";
import { cx } from "@truelend/ui";
import { CATEGORIES, itemsFor } from "@truelend/reference";

// Desktop hover/focus mega-menu for the Products nav item. CSS-only reveal
// (group-hover + group-focus-within) so it works on hover and via keyboard
// without client state. Each category and every item links to a real page.
export function ProductsMenu({ active }: { active: boolean }) {
  return (
    <div className="group relative shrink-0">
      <Link
        href="/products"
        aria-current={active ? "page" : undefined}
        className={cx(
          "flex items-center gap-1 whitespace-nowrap text-base font-medium text-navy-600 transition-colors hover:text-navy-950 group-focus-within:text-navy-950",
          active && "text-navy-950 underline decoration-red-600 decoration-2 underline-offset-8",
        )}
      >
        Products
        <ChevronDown
          className="h-3.5 w-3.5 transition-transform group-hover:rotate-180 group-focus-within:rotate-180"
          aria-hidden
        />
      </Link>

      {/* pt-3 bridges the gap so moving the pointer down keeps the panel open */}
      <div className="invisible absolute left-0 top-full z-50 pt-3 opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="w-[min(760px,calc(100vw-2rem))] rounded-2xl border border-hairline bg-white p-6 shadow-[0_24px_60px_-30px_rgba(20,32,74,0.4)]">
          <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
            {CATEGORIES.map((cat) => {
              const primary = cat.columns[0]?.items.slice(0, 6) ?? [];
              return (
                <div key={cat.key}>
                  <Link
                    href={`/products/all/${cat.key}`}
                    className="font-display text-sm font-bold text-navy-950 hover:text-red-600"
                  >
                    {cat.label}
                  </Link>
                  <ul className="mt-2.5 space-y-1">
                    {primary.map((it) => (
                      <li key={it.slug}>
                        <Link
                          href={`/products/all/${cat.key}/${it.slug}`}
                          className="block truncate rounded py-1 text-[13px] text-navy-600 transition-colors hover:text-red-600"
                        >
                          {it.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/products/all/${cat.key}`}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-navy-800 hover:text-red-600"
                  >
                    View all {itemsFor(cat).length}
                    <MoveUpRight className="h-3 w-3" aria-hidden />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
