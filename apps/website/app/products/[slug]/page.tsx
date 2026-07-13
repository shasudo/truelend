import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Headset, MoveUpRight, FileText, UserCheck } from "lucide-react";
import {
  Accordion,
  Badge,
  Button,
  Card,
  Container,
  HexPattern,
  RateTable,
  SectionHeading,
  Stat,
} from "@truelend/ui";
import { CtaBand } from "@/components/cta-band";
import { Reveal } from "@/components/reveal";
import { products, productBySlug } from "@/content/products";
import { site } from "@/content/site";
import { toRateTableRows } from "@/lib/format";

// Fully static: every product page is prerendered; unknown slugs 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const product = productBySlug((await params).slug);
  if (!product) return {};
  return {
    title: product.name,
    description: `${product.tagline} ${product.description}`.slice(0, 160),
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const product = productBySlug((await params).slug);
  if (!product) notFound();

  const Icon = product.icon;
  const enquiryHref = `/enquiry?product=${product.slug}`;

  return (
    <>
      {/* Product hero */}
      <section className="relative overflow-hidden border-b border-hairline">
        <HexPattern className="-right-32 -top-40 h-[420px] w-[420px] text-navy-800/[0.06]" />
        <Container className="py-14 sm:py-18">
          <nav aria-label="Breadcrumb" className="text-sm text-navy-500">
            <Link href="/products" className="transition-colors hover:text-navy-800">
              Products
            </Link>
            <span aria-hidden> / </span>
            <span className="text-navy-800">{product.name}</span>
          </nav>
          <div className="mt-6 flex items-start gap-5">
            <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-navy-800/[0.06] text-navy-800 sm:flex">
              <Icon className="h-7 w-7" aria-hidden />
            </span>
            <div className="max-w-2xl">
              <h1 className="text-balance font-display text-4xl font-extrabold tracking-tight text-navy-950 sm:text-5xl">
                {product.name}
              </h1>
              <p className="mt-3 font-display text-lg font-semibold text-red-600">
                {product.tagline}
              </p>
              <p className="mt-4 leading-relaxed text-navy-600">{product.description}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <Link href={enquiryHref}>
                    <Headset className="h-4 w-4" aria-hidden />
                    Check My Eligibility
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href={site.whatsappHref} target="_blank" rel="noopener noreferrer">
                    Talk on WhatsApp
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Key facts */}
      <section>
        <Container className="grid grid-cols-1 gap-y-8 border-b border-hairline py-10 text-navy-950 sm:grid-cols-3">
          {product.highlights.map((h, i) => (
            <Stat
              key={h.label}
              value={h.value}
              label={h.label}
              accent={i === 0}
              className={i > 0 ? "sm:border-l sm:border-hairline sm:pl-8" : undefined}
            />
          ))}
        </Container>
      </section>

      {/* Bank-wise rates */}
      {product.rates.length > 0 && (
        <section>
          <Container className="py-16 sm:py-20">
            <Reveal>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <SectionHeading
                  eyebrow="Bank-wise comparison"
                  title={`${product.name} rates across lenders`}
                />
                <Badge variant="red">Indicative</Badge>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <RateTable className="mt-10" rows={toRateTableRows(product.rates)} />
              <p className="mt-4 text-xs leading-relaxed text-navy-400">
                Rates, fees and limits are set by lenders, vary with your profile, and change with
                the market. Treat this table as a starting point — your advisor confirms live
                pricing before any application is filed.
              </p>
            </Reveal>
          </Container>
        </section>
      )}

      {/* Eligibility & documents */}
      <section className="bg-paper-deep/60">
        <Container className="grid gap-4 py-16 sm:py-20 lg:grid-cols-2">
          <Reveal>
            <Card className="h-full p-7">
              <UserCheck className="h-6 w-6 text-red-600" aria-hidden />
              <h2 className="mt-4 font-display text-xl font-bold text-navy-950">
                Who&rsquo;s eligible
              </h2>
              <ul className="mt-5 space-y-3">
                {product.eligibility.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-relaxed text-navy-700">
                    <MoveUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          </Reveal>
          <Reveal delay={0.08}>
            <Card className="h-full p-7">
              <FileText className="h-6 w-6 text-red-600" aria-hidden />
              <h2 className="mt-4 font-display text-xl font-bold text-navy-950">
                Documents you&rsquo;ll need
              </h2>
              <ul className="mt-5 space-y-3">
                {product.documents.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-relaxed text-navy-700">
                    <MoveUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          </Reveal>
        </Container>
      </section>

      {/* FAQs */}
      <section>
        <Container className="grid gap-12 py-16 sm:py-20 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <SectionHeading
              className="lg:sticky lg:top-24"
              eyebrow="Good to know"
              title="Questions borrowers actually ask"
            />
          </Reveal>
          <Reveal delay={0.1}>
            <Accordion items={product.faqs} />
          </Reveal>
        </Container>
      </section>

      <CtaBand
        headline={`Ready to compare ${product.name.toLowerCase()} offers?`}
        href={enquiryHref}
      />
    </>
  );
}
