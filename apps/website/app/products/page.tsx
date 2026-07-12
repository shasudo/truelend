import type { Metadata } from "next";
import { Container } from "@truelend/ui";
import { PageHeader } from "@/components/page-header";
import { CategoryCard } from "@/components/category-card";
import { CtaBand } from "@/components/cta-band";
import { Reveal } from "@/components/reveal";
import { products } from "@/content/products";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Loan Products",
  description:
    "Home loans, business loans, LAP, vehicle and education finance, working capital, equipment finance and credit cards — compared bank-by-bank.",
};

export default function ProductsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Products"
        title="Every major credit product, compared honestly"
        lede="Each product page carries indicative bank-wise rates, eligibility, documents and the questions borrowers actually ask — so you walk in knowing more than the branch expects."
      />

      <section>
        <Container className="py-16 sm:py-20">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p, i) => (
              <Reveal key={p.slug} delay={(i % 3) * 0.06}>
                <CategoryCard product={p} />
              </Reveal>
            ))}
          </div>
          <p className="mt-10 max-w-3xl text-xs leading-relaxed text-navy-400">{site.disclaimer}</p>
        </Container>
      </section>

      <CtaBand />
    </>
  );
}
