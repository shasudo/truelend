import { ChevronDown, MoveUpRight } from "lucide-react";
import { CATEGORIES, itemsFor } from "@truelend/reference";

// The public site's Products mega-menu, mirrored for the partner marketing
// header off the same shared taxonomy. Every link is an absolute cross-origin
// URL: the catalog pages only exist on the website, and a partner prospect
// browsing products is on their way there anyway. CSS-only reveal (group-hover
// + group-focus-within) so it works on hover and via keyboard with no client
// state — this header stays a server component.
const PUBLIC_SITE = "https://truelend.in";

export function ProductsMenu() {
  return (
    <div className="group relative">
      <a
        href={`${PUBLIC_SITE}/products`}
        className="flex items-center gap-1 py-7 text-base font-medium text-navy-700 transition-colors hover:text-red-600 group-focus-within:text-red-600"
      >
        Products
        <ChevronDown
          className="h-3.5 w-3.5 transition-transform group-hover:rotate-180 group-focus-within:rotate-180"
          aria-hidden
        />
      </a>

      {/* pt-3 bridges the gap so moving the pointer down keeps the panel open */}
      <div className="invisible absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3 opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="w-[min(760px,calc(100vw-2rem))] rounded-2xl border border-hairline bg-white p-6 shadow-[0_24px_60px_-30px_rgba(20,32,74,0.4)]">
          <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
            {CATEGORIES.map((cat) => {
              const primary = cat.columns[0]?.items.slice(0, 6) ?? [];
              return (
                <div key={cat.key}>
                  <a
                    href={`${PUBLIC_SITE}/products/all/${cat.key}`}
                    className="font-display text-sm font-bold text-navy-950 hover:text-red-600"
                  >
                    {cat.label}
                  </a>
                  <ul className="mt-2.5 space-y-1">
                    {primary.map((it) => (
                      <li key={it.slug}>
                        <a
                          href={`${PUBLIC_SITE}/products/all/${cat.key}/${it.slug}`}
                          className="block truncate rounded py-1 text-[13px] text-navy-600 transition-colors hover:text-red-600"
                        >
                          {it.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                  <a
                    href={`${PUBLIC_SITE}/products/all/${cat.key}`}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-navy-800 hover:text-red-600"
                  >
                    View all {itemsFor(cat).length}
                    <MoveUpRight className="h-3 w-3" aria-hidden />
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
