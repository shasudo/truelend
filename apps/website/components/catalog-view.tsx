import Link from "next/link";
import { ArrowRight, CheckCircle2, FileText, Headset, MoveUpRight, UserCheck } from "lucide-react";
import {
  Accordion,
  Badge,
  Button,
  Card,
  Container,
  HexPattern,
  SectionHeading,
} from "@truelend/ui";
import { CtaBand } from "@/components/cta-band";
import { Reveal } from "@/components/reveal";
import { site } from "@/content/site";
import type { ItemContent } from "@/content/catalog/content";
import { contentFor } from "@/content/catalog/content";
import type { CatalogCategory, CatalogColumn, CatalogItem } from "@truelend/reference";
import { enquirySlugFor, itemsFor } from "@truelend/reference";

const CATALOG_DISCLAIMER =
  "* Figures marked with an asterisk are indicative — set by lenders, compiled from public sources, and change with the market and your profile. They are not an offer; your advisor confirms live terms with the lender before any application.";

// Marks a value whose amount is unpredictable / subject to change, tied to the
// asterisk footnote (CATALOG_DISCLAIMER).
function Star() {
  return (
    <sup aria-hidden className="ml-0.5 font-normal text-red-600">
      *
    </sup>
  );
}

const DEFAULT_FEATURES = {
  card: [
    "Accelerated rewards on everyday spends",
    "Welcome benefits & milestone bonuses",
    "Fuel surcharge waiver across stations",
    "Contactless & UPI-linked payments",
  ],
  loan: [
    "Competitive interest rates from partner lenders",
    "Flexible tenure to fit your repayment comfort",
    "Minimal, digital-first documentation",
    "No hidden charges — fees disclosed upfront",
  ],
};

const DEFAULT_ELIGIBILITY = {
  card: [
    "Age 18–70 years (varies by issuer)",
    "Stable monthly income or ITR proof",
    "Healthy credit score (typically 750+)",
    "Valid KYC — PAN, Aadhaar & address proof",
  ],
  loan: [
    "Salaried or self-employed with steady income",
    "Age 21–65 years at loan maturity",
    "Credit score of 700+ preferred",
    "Valid KYC and income documents",
  ],
};

const HOW_TO_APPLY = {
  card: [
    {
      t: "Start your enquiry",
      d: "Share a few basic details to begin your enquiry with TrueLend.",
    },
    {
      t: "Verification",
      d: "Our team confirms your eligibility and collects KYC & income proof digitally.",
    },
    { t: "Bank approval", d: "The issuing bank assesses your profile and approves the card." },
    { t: "Card delivered", d: "Your card is dispatched and ready to activate — we stay on hand." },
  ],
  loan: [
    {
      t: "Share your details",
      d: "Tell us the amount and purpose — it takes a couple of minutes.",
    },
    {
      t: "Compare & confirm",
      d: "We surface suitable lenders and confirm your eligibility upfront.",
    },
    {
      t: "Submit documents",
      d: "Upload KYC and income proof securely; we guide you on exactly what's needed.",
    },
    {
      t: "Approval & disbursal",
      d: "Track your application to sanction and disbursal with dedicated support.",
    },
  ],
};

const defaultFaqs = (label: string) => [
  {
    q: `How do I apply for ${label}?`,
    a: "Start your enquiry with TrueLend — share a few details and our team guides you through documentation and the lender's application end to end.",
  },
  {
    q: "Will TrueLend charge me?",
    a: "Our advisory is free for borrowers. Any applicable lender fee is disclosed upfront before you proceed — no hidden charges.",
  },
];

type FactMap = Map<string, string>;
const indexFacts = (facts: { label: string; value: string }[]): FactMap =>
  new Map(facts.map((f) => [f.label, f.value]));

function buildComparison(
  category: CatalogCategory,
  column: CatalogColumn,
  item: CatalogItem,
  cur: ItemContent | null,
) {
  if (!cur?.facts?.length) return null;
  const siblings = column.items
    .filter((it) => it.slug !== item.slug)
    .map((it) => ({ it, c: contentFor(category.key, it.slug) }))
    .filter((x) => x.c?.facts?.length)
    .slice(0, 3);
  if (siblings.length === 0) return null;

  const cols = [
    { label: item.label, facts: indexFacts(cur.facts), current: true },
    ...siblings.map((s) => ({
      label: s.it.label,
      facts: indexFacts(s.c?.facts ?? []),
      current: false,
    })),
  ];
  const rows = cur.facts.slice(0, 5).map((f) => ({
    label: f.label,
    cells: cols.map((col) => ({
      key: col.label,
      value: col.facts.get(f.label) ?? "—",
      current: col.current,
    })),
  }));
  return { cols: cols.map((c) => ({ label: c.label, current: c.current })), rows };
}

/* ---- shared small pieces ---- */

interface FactGridProps {
  facts: { label: string; value: string }[];
}

function FactGrid({ facts }: FactGridProps) {
  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-hairline bg-hairline min-[420px]:grid-cols-2 lg:grid-cols-4">
      {facts.map((f) => (
        <div key={f.label} className="min-w-0 bg-white p-4 sm:p-5">
          <div className="break-words font-display text-lg font-extrabold tabular-nums text-navy-950 sm:text-xl">
            {f.value}
            <Star />
          </div>
          <div className="mt-1 text-xs font-medium text-muted">{f.label}</div>
        </div>
      ))}
    </div>
  );
}

interface BulletCardProps {
  icon: typeof UserCheck;
  title: string;
  items: string[];
}

function BulletCard({ icon: Icon, title, items }: BulletCardProps) {
  return (
    <Card className="h-full p-5 sm:p-7">
      <Icon className="h-6 w-6 text-red-600" aria-hidden />
      <h2 className="mt-4 font-display text-xl font-bold text-navy-950">{title}</h2>
      <ul className="mt-5 space-y-3">
        {items.map((it) => (
          <li key={it} className="flex gap-3 text-sm leading-relaxed text-navy-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
            {it}
          </li>
        ))}
      </ul>
    </Card>
  );
}

interface KVTableProps {
  title: string;
  rows: { label: string; value: string }[];
}

function KVTable({ title, rows }: KVTableProps) {
  return (
    <Card className="overflow-hidden p-0">
      <h2 className="border-b border-hairline px-4 py-4 font-display text-lg font-bold text-navy-950 sm:px-6">
        {title}
      </h2>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r, idx) => (
            <tr key={r.label} className={idx % 2 ? "bg-paper-deep/40" : undefined}>
              <th
                scope="row"
                className="w-2/5 px-4 py-3 text-left align-top font-semibold text-navy-700 sm:px-6"
              >
                {r.label}
              </th>
              <td className="break-words px-4 py-3 text-navy-900 sm:px-6">
                {r.value}
                <Star />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

interface BreadcrumbProps {
  trail: { label: string; href?: string }[];
}

function Breadcrumb({ trail }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-navy-500">
      {trail.map((t, idx) => (
        <span key={t.label}>
          {t.href ? (
            <Link href={t.href} className="transition-colors hover:text-navy-800">
              {t.label}
            </Link>
          ) : (
            <span className="text-navy-800">{t.label}</span>
          )}
          {idx < trail.length - 1 && <span aria-hidden> / </span>}
        </span>
      ))}
    </nav>
  );
}

/* ---- item detail view ---- */

interface CatalogItemViewProps {
  category: CatalogCategory;
  column: CatalogColumn;
  item: CatalogItem;
}

export function CatalogItemView({ category, column, item }: CatalogItemViewProps) {
  const isCard = category.kind === "card";
  const c = contentFor(category.key, item.slug);
  const enquiryHref = `/enquiry?product=${enquirySlugFor(category, item.slug)}`;

  const blurb =
    c?.summary ??
    item.blurb ??
    `Explore ${item.label}${item.provider ? ` from ${item.provider}` : ""} — compare the details, ${
      isCard ? "rewards and fees" : "rates and eligibility"
    }, then apply with TrueLend's guided assistance.`;

  const facts = c?.facts?.length ? c.facts : category.facts;
  const features = c?.features?.length ? c.features : DEFAULT_FEATURES[category.kind];
  const eligibility = c?.eligibility?.length ? c.eligibility : DEFAULT_ELIGIBILITY[category.kind];
  const documents = c?.documents ?? [];
  const fees = c?.fees ?? [];
  const rewards = c?.rewards ?? [];
  const faqs = c?.faqs?.length ? c.faqs : defaultFaqs(item.label);
  const steps = HOW_TO_APPLY[category.kind];
  const comparison = buildComparison(category, column, item, c);
  const related = column.items.filter((it) => it.slug !== item.slug).slice(0, 6);

  return (
    <>
      <section className="relative overflow-hidden border-b border-hairline">
        <HexPattern className="-right-32 -top-40 h-[420px] w-[420px] text-navy-800/[0.06]" />
        <Container className="py-14 sm:py-18">
          <Breadcrumb
            trail={[
              { label: "Products", href: "/products" },
              { label: category.label, href: `/products/all/${category.key}` },
              { label: item.label },
            ]}
          />
          <div className="mt-6 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-600">
              {category.label}
              {item.provider ? ` · ${item.provider}` : ""}
            </p>
            <h1 className="mt-2 text-balance font-display text-4xl font-extrabold tracking-tight text-navy-950 sm:text-5xl">
              {item.label}
            </h1>
            <p className="mt-4 leading-relaxed text-navy-600">{blurb}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href={enquiryHref}>
                  <Headset className="h-4 w-4" aria-hidden />
                  {isCard ? "Apply Now" : "Check My Eligibility"}
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href={site.whatsappHref} target="_blank" rel="noopener noreferrer">
                  Talk on WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </Container>
      </section>

      <section>
        <Container className="space-y-12 py-16 sm:py-20">
          <Reveal>
            <FactGrid facts={facts} />
          </Reveal>

          <Reveal>
            <BulletCard
              icon={CheckCircle2}
              title={isCard ? "Key features & benefits" : "Why borrowers pick this"}
              items={features}
            />
          </Reveal>

          {rewards.length > 0 && (
            <Reveal>
              <KVTable title={isCard ? "Rewards & cashback" : "Rates & slabs"} rows={rewards} />
            </Reveal>
          )}

          {fees.length > 0 && (
            <Reveal>
              <KVTable title="Fees & charges" rows={fees} />
            </Reveal>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Reveal>
              <BulletCard icon={UserCheck} title="Who's eligible" items={eligibility} />
            </Reveal>
            {documents.length > 0 && (
              <Reveal delay={0.08}>
                <BulletCard icon={FileText} title="Documents you'll need" items={documents} />
              </Reveal>
            )}
          </div>

          <Reveal>
            <div>
              <SectionHeading eyebrow="Simple process" title="How to apply" />
              <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {steps.map((s, idx) => (
                  <li key={s.t} className="rounded-xl border border-hairline bg-white p-5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-800 text-sm font-bold text-white">
                      {idx + 1}
                    </span>
                    <p className="mt-4 font-display font-bold text-navy-950">{s.t}</p>
                    <p className="mt-1 text-sm leading-relaxed text-navy-600">{s.d}</p>
                  </li>
                ))}
              </ol>
            </div>
          </Reveal>

          {comparison && (
            <Reveal>
              <div>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <SectionHeading
                    eyebrow="Side by side"
                    title={isCard ? "Similar cards compared" : "Compare with other lenders"}
                  />
                  <Badge variant="red">Indicative</Badge>
                </div>
                <div className="mt-8 overflow-x-auto rounded-xl border border-hairline">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="border-b border-hairline bg-paper-deep/50">
                        <th className="px-4 py-3 text-left font-semibold text-navy-500"> </th>
                        {comparison.cols.map((col) => (
                          <th
                            key={col.label}
                            className={`px-4 py-3 text-left font-bold ${col.current ? "text-red-600" : "text-navy-800"}`}
                          >
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.rows.map((row) => (
                        <tr key={row.label} className="border-b border-hairline last:border-0">
                          <th
                            scope="row"
                            className="px-4 py-3 text-left font-semibold text-navy-700"
                          >
                            {row.label}
                          </th>
                          {row.cells.map((cell) => (
                            <td
                              key={cell.key}
                              className={`px-4 py-3 tabular-nums ${cell.current ? "font-semibold text-navy-950" : "text-navy-700"}`}
                            >
                              {cell.value}
                              {cell.value !== "—" && <Star />}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Reveal>
          )}

          <Reveal>
            <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
              <SectionHeading
                className="lg:sticky lg:top-24"
                eyebrow="Good to know"
                title="Frequently asked questions"
              />
              <Accordion items={faqs} />
            </div>
          </Reveal>

          {related.length > 0 && (
            <Reveal>
              <div>
                <h2 className="font-display text-xl font-bold text-navy-950">
                  More in {column.heading}
                </h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {related.map((r) => (
                    <Link
                      key={r.slug}
                      href={`/products/all/${category.key}/${r.slug}`}
                      className="group flex items-center justify-between gap-2 rounded-xl border border-hairline bg-white p-4 text-sm font-semibold text-navy-800 transition-colors hover:border-navy-800/35 hover:text-red-600"
                    >
                      {r.label}
                      <MoveUpRight
                        className="h-4 w-4 shrink-0 text-muted transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-red-600"
                        aria-hidden
                      />
                    </Link>
                  ))}
                </div>
              </div>
            </Reveal>
          )}

          <p className="max-w-3xl text-xs leading-relaxed text-muted">{CATALOG_DISCLAIMER}</p>
        </Container>
      </section>

      <CtaBand headline={`Ready to move on ${item.label.toLowerCase()}?`} href={enquiryHref} />
    </>
  );
}

/* ---- category listing view ---- */

interface CatalogCategoryViewProps {
  category: CatalogCategory;
}

export function CatalogCategoryView({ category }: CatalogCategoryViewProps) {
  const count = itemsFor(category).length;
  const enquiryHref = `/enquiry?product=${category.enquirySlug}`;

  return (
    <>
      <section className="relative overflow-hidden border-b border-hairline">
        <HexPattern className="-right-32 -top-40 h-[420px] w-[420px] text-navy-800/[0.06]" />
        <Container className="py-14 sm:py-18">
          <Breadcrumb
            trail={[{ label: "Products", href: "/products" }, { label: category.label }]}
          />
          <div className="mt-6 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-600">
              {count} options
            </p>
            <h1 className="mt-2 text-balance font-display text-4xl font-extrabold tracking-tight text-navy-950 sm:text-5xl">
              {category.label}
            </h1>
            <p className="mt-4 leading-relaxed text-navy-600">{category.tagline}</p>
            <div className="mt-7">
              <Button size="lg" asChild>
                <Link href={enquiryHref}>
                  Get started <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>

      <section>
        <Container className="py-16 sm:py-20">
          <Reveal>
            <FactGrid facts={category.facts} />
          </Reveal>
          <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {category.columns.map((col) => (
              <div key={col.heading}>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-600">
                  {col.heading}
                </p>
                <ul className="mt-3 space-y-1">
                  {col.items.map((it) => (
                    <li key={it.slug}>
                      <Link
                        href={`/products/all/${category.key}/${it.slug}`}
                        className="group flex items-center gap-1 rounded py-1.5 text-sm text-navy-700 transition-colors hover:text-red-600"
                      >
                        <span>{it.label}</span>
                        <MoveUpRight
                          className="h-3.5 w-3.5 shrink-0 text-muted opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-red-600 group-hover:opacity-100"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-12 max-w-3xl text-xs leading-relaxed text-muted">{CATALOG_DISCLAIMER}</p>
        </Container>
      </section>

      <CtaBand />
    </>
  );
}
