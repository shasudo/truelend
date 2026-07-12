import Link from "next/link";
import { Phone, ShieldCheck, MoveUpRight } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Container,
  HexPattern,
  RateTable,
  SectionHeading,
} from "@truelend/ui";
import { Reveal } from "@/components/reveal";
import { StatsBand } from "@/components/stats-band";
import { CategoryCard } from "@/components/category-card";
import { PartnerStrip } from "@/components/partner-strip";
import { CtaBand } from "@/components/cta-band";
import { products, productBySlug } from "@/content/products";
import { banks } from "@/content/banks";
import { rateRange, toRateTableRows } from "@/lib/format";

const heroChips = ["Right Lender", "Better Terms", "Higher Approval Probability"];

const steps = [
  {
    title: "Understand You",
    desc: "Your needs, income shape and timelines — before any product talk.",
  },
  {
    title: "Assess Profile",
    desc: "Credit health, obligations and real eligibility, mapped honestly.",
  },
  { title: "Analyze Lenders", desc: "Policies and pricing compared across 50+ banks and NBFCs." },
  {
    title: "Find the Right Fit",
    desc: "Lenders whose credit model actually rewards your profile.",
  },
  {
    title: "Apply with Ease",
    desc: "One clean file, guided documentation, no running around twice.",
  },
  {
    title: "Get Disbursed",
    desc: "We chase sanction to disbursal and stay accountable throughout.",
  },
];

const whyItems = [
  {
    title: "Access to multiple banks & NBFCs",
    desc: "One enquiry puts 50+ lenders in play — not just the one whose branch you walked into.",
  },
  {
    title: "Expert advisors you can trust",
    desc: "People who read credit policy for a living, sitting on your side of the table.",
  },
  {
    title: "Higher approval probability",
    desc: "Your file goes where it fits the credit model — approval odds rise before you apply.",
  },
  {
    title: "Better rates & loan options",
    desc: "Lenders compete for a well-presented file. You collect the difference.",
  },
  {
    title: "Faster turnaround time",
    desc: "Complete documentation the first time cuts weeks of back-and-forth.",
  },
  {
    title: "End-to-end support",
    desc: "From first call to disbursal — and for every loan after this one.",
  },
  {
    title: "100% safe & confidential",
    desc: "Your documents move only to the lender you approve. No spam calls, ever.",
  },
];

function HeroComparisonCard() {
  const homeLoan = productBySlug("home-loan")!;
  const rows = homeLoan.rates.slice(0, 4);
  return (
    <Card className="relative shadow-[0_24px_60px_-24px_rgba(20,32,74,0.35)]">
      <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-navy-400">
            Live comparison
          </p>
          <p className="mt-0.5 font-display font-bold text-navy-950">Home Loan · ₹75 L · 20 yrs</p>
        </div>
        <Badge variant="red">Illustrative</Badge>
      </div>
      <ul>
        {rows.map((row, i) => {
          const bank = banks.find((b) => b.slug === row.bankSlug);
          const best = i === 0;
          return (
            <li
              key={row.bankSlug}
              className={
                best
                  ? "flex items-center justify-between border-b border-hairline border-l-2 border-l-red-600 bg-red-50/60 px-6 py-3.5"
                  : "flex items-center justify-between border-b border-hairline px-6 py-3.5 last:border-b-0"
              }
            >
              <span className="flex items-center gap-2 text-sm font-medium text-navy-950">
                {bank?.name}
                {best && (
                  <span className="text-xs font-bold uppercase tracking-wide text-red-600">
                    Best fit
                  </span>
                )}
              </span>
              <span className="font-display font-bold tabular-nums text-navy-950">
                {rateRange(row)}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="px-6 py-3 text-xs text-navy-400">
        Indicative rates — your match depends on your profile.
      </p>
    </Card>
  );
}

export default function Home() {
  const homeLoan = productBySlug("home-loan")!;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <HexPattern className="-right-36 -top-24 h-[620px] w-[620px] text-navy-800/[0.05]" />
        <Container className="grid items-center gap-14 py-16 sm:py-24 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <Reveal immediate>
              <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-red-600">
                <span aria-hidden className="h-px w-8 bg-red-600" />
                Smarter borrowing starts here
              </p>
              <h1 className="mt-5 text-balance font-display text-5xl font-extrabold leading-[1.02] tracking-tight text-navy-950 sm:text-6xl">
                We help you choose the right loan.{" "}
                <span className="text-red-600">From the right lender.</span>
              </h1>
            </Reveal>
            <Reveal immediate delay={0.1}>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-navy-600">
                TrueLend analyses your financial profile and matches you with lenders whose policies
                best fit your needs — so the decision is made before the application is.
              </p>
              <ul className="mt-6 flex flex-wrap gap-2.5">
                {heroChips.map((chip) => (
                  <li
                    key={chip}
                    className="flex items-center gap-1.5 rounded-full border border-hairline bg-white px-3.5 py-1.5 text-sm font-medium text-navy-800"
                  >
                    <MoveUpRight className="h-3.5 w-3.5 text-red-600" aria-hidden />
                    {chip}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal immediate delay={0.2}>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <Link href="/enquiry">
                    <Phone className="h-4 w-4" aria-hidden />
                    Speak to an Advisor
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/products">Explore Loan Products</Link>
                </Button>
              </div>
              <p className="mt-5 flex items-center gap-2 text-sm text-navy-500">
                <ShieldCheck className="h-4 w-4 text-navy-400" aria-hidden />
                100% Confidential · No Spam Calls
              </p>
            </Reveal>
          </div>
          <Reveal immediate delay={0.15} className="lg:justify-self-end lg:w-full lg:max-w-md">
            <HeroComparisonCard />
          </Reveal>
        </Container>
      </section>

      <StatsBand />

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20">
        <Container className="py-20 sm:py-24">
          <Reveal>
            <SectionHeading
              eyebrow="Our borrowing intelligence approach"
              title="How TrueLend works for you"
              lede="Six deliberate steps between your first call and the money in your account — each one designed to remove a place borrowers usually lose."
            />
          </Reveal>
          <ol className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {steps.map((step, i) => (
              <Reveal key={step.title} delay={(i % 3) * 0.08}>
                <li className="border-t border-hairline pt-5">
                  <span className="font-display text-2xl font-extrabold tabular-nums text-red-600">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-3 font-display text-lg font-bold text-navy-950">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-navy-600">{step.desc}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </Container>
      </section>

      {/* Products */}
      <section className="bg-paper-deep/60">
        <Container className="py-20 sm:py-24">
          <Reveal>
            <SectionHeading
              eyebrow="Loans we help you get"
              title="Nine products. One standard of advice."
              lede="Whatever you're funding, the method is the same — understand the need, compare the market, and place the file where it wins."
            />
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p, i) => (
              <Reveal key={p.slug} delay={(i % 3) * 0.06}>
                <CategoryCard product={p} />
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* Why TrueLend */}
      <section>
        <Container className="grid gap-12 py-20 sm:py-24 lg:grid-cols-[0.85fr_1.15fr]">
          <Reveal>
            <SectionHeading
              className="lg:sticky lg:top-24"
              eyebrow="Why choose TrueLend"
              title="Advice that sits on your side of the table"
              lede="Banks optimise for their book. Dealers optimise for their payout. Somebody should be optimising for you."
            />
          </Reveal>
          <div>
            {whyItems.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.04}>
                <div className="flex gap-4 border-b border-hairline py-5 first:border-t">
                  <MoveUpRight className="mt-1 h-4 w-4 shrink-0 text-red-600" aria-hidden />
                  <div>
                    <h3 className="font-semibold text-navy-950">{item.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-navy-600">{item.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* Rates teaser */}
      <section className="bg-paper-deep/60">
        <Container className="py-20 sm:py-24">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <SectionHeading
                eyebrow="Today's market"
                title="Bank-wise rates, in the open"
                lede="A sample from our home loan desk. Every product page carries the full lender-by-lender table."
              />
              <Badge variant="red">Indicative</Badge>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <RateTable
              className="mt-10"
              compact
              rows={toRateTableRows(homeLoan.rates.slice(0, 4))}
            />
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-navy-500">
                Rates are set by lenders and move with the market — treat these as a starting point.
              </p>
              <Button variant="outline" asChild>
                <Link href="/products">
                  See every product&rsquo;s rates <MoveUpRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </div>
          </Reveal>
        </Container>
      </section>

      <PartnerStrip />
      <CtaBand />
    </>
  );
}
