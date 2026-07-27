import type { Metadata } from "next";
import { Container } from "@truelend/ui";
import { PageHeader } from "@/components/page-header";
import { CategoryCard } from "@/components/category-card";
import { CtaBand } from "@/components/cta-band";
import { ProductCatalog } from "@/components/product-catalog";
import { Reveal } from "@/components/reveal";
import { loanProductCards, productCardName } from "@/content/products";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Loan Products",
  description:
    "From personal and home loans to business finance and credit cards, introduce anyone to the product they need and TrueLend matches them with the right lender.",
  alternates: { canonical: "/products" },
};

export default function ProductsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Products"
        title="Loan products you can help people get"
        lede="From personal and home loans to business finance and credit cards—introduce anyone to the product they need, and we match them with the right lender."
      />

      <section>
        <Container className="py-16 sm:py-20">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loanProductCards.map((p, i) => (
              <Reveal key={p.slug} delay={(i % 3) * 0.06}>
                <CategoryCard product={p} name={productCardName[p.slug]} />
              </Reveal>
            ))}
          </div>
          <p className="mt-10 max-w-3xl text-xs leading-relaxed text-muted">
            <span aria-hidden>* </span>
            {site.disclaimer}
          </p>
        </Container>
      </section>

      <ProductCatalog />

      <CtaBand />
    </>
  );
}
