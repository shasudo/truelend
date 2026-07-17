import Link from "next/link";
import { MoveUpRight } from "lucide-react";
import { Badge, Button, Container, RateTable, SectionHeading } from "@truelend/ui";
import { Reveal } from "@/components/reveal";
import { HomeHero } from "@/components/home-hero";
import { CategoryCard } from "@/components/category-card";
import { PartnerStrip } from "@/components/partner-strip";
import { PostCard } from "@/components/post-card";
import { CtaBand } from "@/components/cta-band";
import { products, productBySlug } from "@/content/products";
import { toRateTableRows } from "@/lib/format";
import { getAllPosts } from "@/lib/blog";

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

export default function Home() {
  const homeLoan = productBySlug("home-loan")!;
  const posts = getAllPosts().slice(0, 3);

  return (
    <>
      <HomeHero />
      <PartnerStrip />

      <section id="how-it-works" className="scroll-mt-20">
        <Container className="py-12 sm:py-16">
          <Reveal>
            <SectionHeading
              eyebrow="Our borrowing intelligence approach"
              title="How TrueLend works for you"
              lede="Six deliberate steps between your first call and the money in your account — each one designed to remove a place borrowers usually lose."
            />
          </Reveal>
          <ol className="mt-6 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.title} className="border-t border-hairline pt-3">
                <Reveal delay={(i % 3) * 0.08}>
                  <span className="font-display text-2xl font-extrabold tabular-nums text-red-600">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-1.5 font-display text-lg font-bold text-navy-950">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-navy-600">{step.desc}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="bg-paper-deep/60">
        <Container className="py-20 sm:py-24">
          <Reveal>
            <SectionHeading
              eyebrow="Loans we help you get"
              title="One standard of advice."
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

      <section>
        <Container className="py-20 sm:py-24">
          <Reveal>
            <SectionHeading
              eyebrow="The ledger"
              title="Borrowing, explained without the fine print"
              lede="Notes from our advisory desk on scores, switching and the real cost of convenient money."
            />
          </Reveal>
          {posts.length === 0 ? (
            <p className="mt-12 text-navy-600">New articles are on the way.</p>
          ) : (
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post, i) => (
                <Reveal key={post.slug} delay={(i % 3) * 0.06}>
                  <PostCard post={post} />
                </Reveal>
              ))}
            </div>
          )}
        </Container>
      </section>

      <CtaBand />
    </>
  );
}
