import Image from "next/image";
import {
  Briefcase,
  Building2,
  Car,
  CreditCard,
  GraduationCap,
  Home,
  IndianRupee,
  Tractor,
  User,
} from "lucide-react";
import { Container, SectionHeading } from "@truelend/ui";
import { products, type ProductSlug } from "@truelend/reference";

const productPresentation = {
  "personal-loan": {
    icon: User,
    blurb: "Quick funds for personal needs.",
    image: "/images/products/personal-loan.avif",
  },
  "home-loan": {
    icon: Home,
    blurb: "Turn a dream home into reality.",
    image: "/images/products/home-loan.avif",
  },
  "business-loan": {
    icon: Briefcase,
    blurb: "Fuel business growth and expansion.",
    image: "/images/products/business-loan.avif",
  },
  "loan-against-property": {
    icon: Building2,
    blurb: "Unlock the value in owned property.",
    image: "/images/products/loan-against-property.avif",
  },
  "credit-cards": {
    icon: CreditCard,
    blurb: "Everyday convenience and flexibility.",
    image: "/images/products/credit-cards.avif",
  },
  "education-loan": {
    icon: GraduationCap,
    name: "Educational Loan",
    blurb: "Invest in a brighter future.",
    image: "/images/products/education-loan.avif",
  },
  "vehicle-loan": {
    icon: Car,
    name: "Car Loan",
    blurb: "Finance the right car or vehicle.",
    image: "/images/products/vehicle-loan.avif",
  },
  "working-capital": {
    icon: IndianRupee,
    name: "Working Capital Loan",
    blurb: "Breathing room for the operating cycle.",
    image: "/images/products/working-capital.avif",
  },
  "equipment-finance": {
    icon: Tractor,
    name: "Loans for Schools & Colleges",
    blurb: "Fund campus infrastructure and expansion.",
    image: "/images/products/equipment-finance.avif",
  },
} satisfies Record<
  ProductSlug,
  {
    icon: typeof User;
    /** Overrides the catalog name where the borrower-facing label differs. */
    name?: string;
    blurb: string;
    image: string;
  }
>;

// The order prospects see this section in; slugs left out stay off the landing page.
const displayOrder: ProductSlug[] = [
  "credit-cards",
  "personal-loan",
  "business-loan",
  "home-loan",
  "education-loan",
  "vehicle-loan",
  "working-capital",
  "equipment-finance",
];

const loanProducts = displayOrder
  .map((slug) => products.find((product) => product.slug === slug))
  .filter((product): product is (typeof products)[number] => Boolean(product))
  .map((product) => ({
    ...product,
    ...productPresentation[product.slug],
  }));

export function LoanProductsSection() {
  return (
    <section id="loan-products" className="scroll-mt-20 border-b border-hairline bg-paper-deep/40">
      <Container className="max-w-[1240px] py-16 sm:py-20">
        <SectionHeading
          eyebrow="Loan products"
          title="Loan products you can help people get"
          lede="From personal and home loans to business finance and credit cards—introduce anyone to the product they need, and we match them with the right lender."
        />
        <div className="mt-10 grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {loanProducts.map((product) => (
            <article
              key={product.slug}
              className="overflow-hidden rounded-xl border border-hairline bg-white"
            >
              <div className="relative aspect-[3/2] overflow-hidden border-b border-hairline">
                <Image
                  src={product.image}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 240px, (min-width: 640px) 33vw, (min-width: 380px) 50vw, calc(100vw - 40px)"
                  className="object-cover object-center"
                />
                <span className="absolute bottom-3 left-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/90 text-navy-800 shadow-[0_12px_24px_-18px_rgba(7,13,36,0.8)] backdrop-blur-sm">
                  <product.icon className="h-5 w-5" aria-hidden />
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-display font-bold text-navy-950">{product.name}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-navy-600">{product.blurb}</p>
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
