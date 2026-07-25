import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  BadgeIndianRupee,
  BriefcaseBusiness,
  Building2,
  Car,
  CreditCard,
  GraduationCap,
  Home,
  IndianRupee,
  Tractor,
  User,
} from "lucide-react";
import { appUrls, products } from "@truelend/reference";

/*
 * Icons for the canonical product list. @truelend/reference is deliberately a
 * zero-dependency data package, so the lucide mapping lives with the app that
 * renders it; the website keeps its own for the same reason. Slugs are the
 * contract — an unmapped one falls back rather than throwing.
 */
const productIcons: Record<string, LucideIcon> = {
  "home-loan": Home,
  "loan-against-property": Building2,
  "business-loan": BriefcaseBusiness,
  "personal-loan": User,
  "vehicle-loan": Car,
  "education-loan": GraduationCap,
  "working-capital": IndianRupee,
  "equipment-finance": Tractor,
  "credit-cards": CreditCard,
};

// Rates, eligibility and documents live on the public site — partners read the
// same pages their customers do, so there is one published source for them.
const PUBLIC_SITE = appUrls.website;

/** Starts a case/referral with the product already chosen. Signed-in only. */
export const submitProductHref = (submitHref: string) => (slug: string) =>
  `${submitHref}?product=${slug}`;

export function ProductCatalog({
  hrefFor,
  showDetails = false,
}: {
  /*
   * Where a card goes, by slug. The link target is the caller's business —
   * signed-in pages start a prefilled case, the public landing page has no
   * session to submit with and sends prospects to the public product page.
   */
  hrefFor: (slug: string) => string;
  /** Also link out to the public product page for rates and eligibility. */
  showDetails?: boolean;
}) {
  return (
    <div
      className={
        showDetails
          ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
          : "grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-5"
      }
    >
      {products.map((product) => {
        const Icon = productIcons[product.slug] ?? BadgeIndianRupee;
        return (
          <div
            key={product.slug}
            className="rounded-xl border border-hairline bg-white transition duration-200 hover:border-navy-800/30 hover:shadow-[0_18px_36px_-28px_rgba(7,13,36,0.65)]"
          >
            <Link
              href={hrefFor(product.slug)}
              className="group flex items-center gap-3 rounded-xl p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-800/[0.06] text-navy-800 transition-colors group-hover:bg-red-50 group-hover:text-red-600">
                <Icon className="h-4.5 w-4.5" aria-hidden />
              </span>
              <span className="min-w-0 text-sm font-semibold leading-snug text-navy-950">
                {product.name}
              </span>
            </Link>
            {showDetails && (
              <a
                href={`${PUBLIC_SITE}/products/${product.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 border-t border-hairline px-4 py-2.5 text-xs font-semibold text-navy-600 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
              >
                Rates &amp; eligibility
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                <span className="sr-only">for {product.name} (opens truelend.in in a new tab)</span>
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}
