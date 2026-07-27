import Link from "next/link";
import { ArrowRight, MoveUpRight } from "lucide-react";
import { Container, SectionHeading } from "@truelend/ui";
import { Reveal } from "@/components/reveal";
import { HomeHero } from "@/components/home-hero";
import { CategoryCard } from "@/components/category-card";
import { PartnerStrip } from "@/components/partner-strip";
import { PostCard } from "@/components/post-card";
import { CtaBand } from "@/components/cta-band";
import { loanProductCards, productCardName } from "@/content/products";
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
    title: "Access to Multiple Lending Partners",
    desc: "Compare suitable borrowing options across multiple banks, NBFCs and Fintech lenders through a single advisory relationship.",
  },
  {
    title: "Experienced Borrowing Advisors",
    desc: "Work with advisors who understand lending policies and help you make informed borrowing decisions.",
  },
  {
    title: "Better Loan Choices",
    desc: "We compare more than interest rates, including eligibility, repayment flexibility, processing timelines and overall suitability.",
  },
  {
    title: "Better Prepared Applications",
    desc: "Complete documentation and structured guidance help present your application more effectively.",
  },
  {
    title: "Faster Processing Support",
    desc: "We coordinate with lending partners and keep you informed throughout the process.",
  },
  {
    title: "End-to-End Assistance",
    desc: "From your first conversation until loan disbursement, we’re available to guide and support you.",
  },
  {
    title: "Secure & Confidential",
    desc: "Your information is shared only with relevant lending partners after your consent and handled with appropriate care.",
  },
];

// Home leans shorter than the catalog taglines; names come from productCardName.
const homeProductTagline: Record<string, string> = {
  "credit-cards": "Cards matched to your spending needs.",
  "personal-loan": "Quick funds when needed.",
  "business-loan": "Funding to grow your business.",
  "home-loan": "Finance your dream home.",
  "education-loan": "Support higher educational goals.",
  "vehicle-loan": "Finance your new or used vehicle.",
  "working-capital": "Manage your business cash flow.",
  "equipment-finance": "Fund campus infrastructure and expansion.",
};

export default function Home() {
  const posts = getAllPosts().slice(0, 3);

  return (
    <>
      <HomeHero />
      <PartnerStrip />

      <section id="how-it-works" className="scroll-mt-20">
        <Container className="py-20 sm:py-24 lg:pl-14">
          <Reveal>
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-muted">
                Our Borrowing Intelligence Framework
              </p>
              <h2 className="mt-4 text-balance font-display text-4xl font-extrabold tracking-tight text-red-600 sm:text-5xl">
                How We Help You Borrow Better
              </h2>
              <p className="mt-6 max-w-[46rem] text-lg leading-8 text-navy-600">
                Every borrower is unique. Before recommending a lender, our experienced Borrowing
                Advisors understand your borrowing requirement, review your financial profile,
                compare lending policies across multiple banks, NBFCs and Fintech lenders, and guide
                you through every step of the borrowing journey.
              </p>
            </div>
          </Reveal>
          <ol className="mt-14 grid gap-x-12 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.title}>
                <Reveal delay={(i % 3) * 0.08}>
                  <span className="font-display text-4xl font-extrabold tabular-nums leading-none text-red-600">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-3 font-display text-xl font-bold text-navy-950 sm:text-2xl">
                    {step.title}
                  </h3>
                  <p className="mt-3 max-w-sm text-base leading-7 text-navy-600">{step.desc}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="bg-paper-deep">
        <div className="relative z-10 bg-paper-deep lg:sticky lg:top-20">
          <Container className="py-8 sm:py-10">
            <SectionHeading
              className="mx-auto max-w-[44rem]"
              eyebrow="Borrowing Solutions"
              title="Borrowing Solutions for Every Need"
              lede="Whether you’re buying a home, expanding your business, managing personal finances or funding higher education, we help you choose the right borrowing solution from the right lender."
              center
              titleClassName="text-navy-950 sm:text-5xl"
              ledeClassName="mx-auto max-w-[44rem] text-lg leading-8"
            />
          </Container>
        </div>
        <Container className="pb-20 sm:pb-24">
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loanProductCards.map((product, i) => (
              <Reveal key={product.slug} delay={(i % 3) * 0.06}>
                <CategoryCard
                  product={product}
                  name={productCardName[product.slug]}
                  tagline={homeProductTagline[product.slug]}
                  showRate={false}
                  centered
                />
              </Reveal>
            ))}
          </div>
          <Reveal>
            <div className="mt-10 flex flex-col items-center justify-between gap-5 rounded-2xl border border-hairline bg-white px-6 py-5 text-center sm:flex-row sm:text-left">
              <div>
                <p className="font-display text-lg font-bold text-navy-950">
                  Need help choosing the right solution?
                </p>
                <p className="mt-1 text-sm text-navy-600">
                  An experienced Borrowing Advisor can help you compare your options.
                </p>
              </div>
              <Link
                href="/enquiry"
                className="inline-flex shrink-0 items-center gap-2 font-semibold text-red-600 hover:text-red-700"
              >
                Talk to a Borrowing Advisor
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </Reveal>
        </Container>
      </section>

      <section>
        <Container className="grid gap-12 py-20 sm:py-24 lg:grid-cols-[0.85fr_1.15fr]">
          <Reveal>
            <SectionHeading
              className="max-w-[26rem] lg:sticky lg:top-24"
              eyebrow="Why Borrowers Choose TrueLend"
              eyebrowClassName="text-muted"
              title="Advice that works for you, not just the lender"
              lede="At TrueLend, we believe better borrowing decisions begin with better understanding. We take time to understand your needs, evaluate suitable lending options and guide you towards a borrowing solution that fits your profile—not just today’s requirement, but your long-term financial well-being."
              titleClassName="text-navy-950 sm:text-5xl"
              ledeClassName="text-lg leading-8"
            />
          </Reveal>
          <div>
            {whyItems.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.04}>
                <div className="flex gap-4 border-b border-hairline py-6 first:border-t">
                  <MoveUpRight className="mt-1 h-4 w-4 shrink-0 text-red-600" aria-hidden />
                  <div>
                    <h3 className="font-display text-lg font-bold text-navy-950">{item.title}</h3>
                    <p className="mt-2 text-base leading-7 text-navy-600">{item.desc}</p>
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
              title="Insights That Help You Borrow Better"
              lede="Practical insights, borrowing tips and expert guidance from the TrueLend team to help you understand loans, avoid common mistakes and make informed borrowing decisions."
              ledeClassName="max-w-3xl text-lg leading-8"
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
