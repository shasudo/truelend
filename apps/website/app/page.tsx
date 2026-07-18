import { MoveUpRight } from "lucide-react";
import { Container, SectionHeading } from "@truelend/ui";
import { Reveal } from "@/components/reveal";
import { HomeHero } from "@/components/home-hero";
import { CategoryCard } from "@/components/category-card";
import { PartnerStrip } from "@/components/partner-strip";
import { PostCard } from "@/components/post-card";
import { CtaBand } from "@/components/cta-band";
import { loanProductCards } from "@/content/products";
import { getAllPosts } from "@/lib/blog";

const steps = [
  {
    title: "Understand You",
    desc: "We begin by understanding your borrowing requirement, financial goals and repayment preferences before discussing any loan options.",
  },
  {
    title: "Review Your Financial Profile",
    desc: "We review your income, existing obligations, credit profile and overall financial position to assess borrowing suitability.",
  },
  {
    title: "Compare Lending Policies",
    desc: "We compare your profile with the lending policies of multiple banks, NBFCs and Fintech Lenders to identify suitable borrowing options.",
  },
  {
    title: "Identify the Right Fit",
    desc: "We shortlist borrowing options that best align with your financial profile, borrowing needs and repayment capacity.",
  },
  {
    title: "Apply with Confidence",
    desc: "We help you prepare the required documentation and guide you through the application process with your selected lender.",
  },
  {
    title: "Support Until Disbursement",
    desc: "We stay with you through the lender’s process until your loan is successfully disbursed, keeping you informed at every stage.",
  },
];

const whyItems = [
  {
    title: "Access to multiple banks & NBFCs",
    desc: "One enquiry puts our partner lenders in play — not just the one whose branch you walked into.",
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
  const posts = getAllPosts().slice(0, 3);

  return (
    <>
      <HomeHero />
      <PartnerStrip />

      <section id="how-it-works" className="scroll-mt-20">
        <Container className="py-12 sm:py-16">
          <Reveal>
            <SectionHeading
              eyebrow="Our Borrowing Intelligence Framework"
              eyebrowClassName="text-muted"
              title="How We Help You Borrow Better"
              titleClassName="text-red-600"
              lede="Every borrower is unique. Before recommending a lender, our experienced borrowing advisors understand your borrowing requirement, review your financial profile, compare lending policies across multiple banks, NBFCs and Fintech Lenders and guide you through every step of the borrowing journey."
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
              title="Loan products you can help people get"
              lede="From personal and home loans to business finance and credit cards—introduce anyone to the product they need, and we match them with the right lender."
            />
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loanProductCards.map((p, i) => (
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
