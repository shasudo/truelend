import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { HeartHandshake, Headset, MessageCircle, MessagesSquare, ShieldCheck } from "lucide-react";
import { Button, Container } from "@truelend/ui";
import { Reveal } from "@/components/reveal";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn why TrueLend exists, who we are and how our borrower-first approach supports better borrowing decisions.",
  alternates: { canonical: "/about" },
};

const values = [
  {
    icon: HeartHandshake,
    title: "Borrower First",
    desc: "Every recommendation begins with understanding your financial needs, goals and circumstances before suggesting any borrowing solution.",
  },
  {
    icon: ShieldCheck,
    title: "Responsible Borrowing",
    desc: "We believe borrowing should strengthen your financial future. We encourage informed decisions, transparent communication and solutions aligned with your repayment capacity.",
  },
  {
    icon: MessagesSquare,
    title: "Trusted Guidance",
    desc: "Built by professionals with decades of experience in banking, lending and financial services to help borrowers navigate choices with clarity and confidence.",
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="relative min-h-[34rem] overflow-hidden bg-white sm:min-h-[38rem]">
        <Image
          src="/images/pages/about-guidance-hero.webp"
          alt="Abstract white folded paper with a red line guiding through the layers"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div
          className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,1)_0%,rgba(255,255,255,.98)_42%,rgba(255,255,255,.4)_67%,rgba(255,255,255,0)_100%)]"
          aria-hidden
        />
        <Container className="relative flex min-h-[34rem] items-center py-14 sm:min-h-[38rem] sm:py-16">
          <Reveal immediate className="max-w-[43rem]">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-red-600">
              About TrueLend
            </p>
            <h1 className="mt-5 break-words text-balance font-display text-[2.5rem] font-extrabold leading-[1.08] tracking-[-0.035em] text-navy-950 min-[400px]:text-5xl sm:text-6xl sm:tracking-[-0.04em] lg:text-7xl">
              We believe borrowing decisions deserve{" "}
              <span className="text-red-600">better guidance.</span>
            </h1>
            <span className="mt-8 block h-0.5 w-14 bg-red-600" aria-hidden />
            <div className="mt-7 max-w-xl space-y-7 text-base leading-8 text-navy-700 sm:text-lg">
              <p>
                Every borrowing decision has a long-term financial impact. Yet many borrowers still
                choose the first lender they approach because they don&rsquo;t know there may be
                better alternatives.
              </p>
              <p>
                At TrueLend, we exist to change that—by helping you explore the right options and
                borrow with confidence.
              </p>
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="border-t border-hairline bg-white">
        <Container className="grid gap-14 py-20 sm:py-24 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <span className="block h-0.5 w-8 bg-red-600" aria-hidden />
            <h2 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-navy-950 sm:text-4xl">
              Why We Exist
            </h2>
            <div className="mt-6 max-w-md space-y-5 text-base leading-8 text-navy-700">
              <p>
                Borrowing today can be overwhelming. Different lenders. Different rules. Different
                policies. Comparing options can be confusing and time-consuming—often leading
                borrowers to settle for less.
              </p>
              <p className="border-l-2 border-red-600 pl-5 font-display text-lg font-bold leading-8 text-navy-950">
                We exist to bring clarity, create better choices and help you make informed
                borrowing decisions.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <span className="block h-0.5 w-8 bg-red-600" aria-hidden />
            <h2 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-navy-950 sm:text-4xl">
              Who We Are
            </h2>
            <div className="mt-6 max-w-lg space-y-6 text-base leading-8 text-navy-700">
              <p>
                TrueLend is an independent borrowing advisory platform. We work with a wide network
                of banks, NBFCs and lending partners to help individuals and businesses find
                borrowing solutions that truly fit their needs.
              </p>
              <p>
                Our experienced Borrowing Advisors understand your goals, evaluate suitable options
                and support you throughout your borrowing journey—from your first enquiry to
                disbursement.
              </p>
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="bg-paper">
        <Container className="py-16 sm:py-20">
          <Reveal>
            <div className="border-l-2 border-red-600 pl-5 sm:pl-10">
              <h2 className="max-w-4xl text-balance font-display text-2xl font-extrabold leading-tight tracking-tight text-navy-950 min-[400px]:text-3xl sm:text-4xl">
                Built on Experience.
                <br />
                Driven by Better Borrowing Decisions.
              </h2>
              <p className="mt-5 max-w-4xl text-base leading-8 text-navy-700">
                Built by professionals with decades of experience in banking, lending and financial
                services, TrueLend combines deep industry expertise with a borrower-first approach
                to help individuals and businesses make informed borrowing decisions.
              </p>
            </div>
          </Reveal>

          <Reveal>
            <div className="relative mt-16 border-t border-hairline pt-12">
              <span
                className="absolute left-1/2 top-0 h-0.5 w-8 -translate-x-1/2 bg-red-600"
                aria-hidden
              />
              <h2 className="text-center font-display text-3xl font-extrabold text-navy-950">
                What Defines Us
              </h2>
              <div className="mt-10 grid gap-10 md:grid-cols-3 md:gap-0">
                {values.map(({ icon: Icon, title, desc }, index) => (
                  <div
                    key={title}
                    className={`px-2 md:px-8 ${index > 0 ? "md:border-l md:border-hairline" : ""}`}
                  >
                    <Icon className="h-12 w-12 text-red-600" strokeWidth={1.7} aria-hidden />
                    <h3 className="mt-5 font-display text-lg font-bold text-navy-950">{title}</h3>
                    <span className="mt-3 block h-0.5 w-8 bg-red-600" aria-hidden />
                    <p className="mt-4 text-sm leading-7 text-navy-700">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="bg-paper pb-16 sm:pb-20">
        <Container>
          <Reveal>
            <div className="relative overflow-hidden rounded-2xl bg-navy-950 px-7 py-8 text-white sm:px-10 lg:flex lg:items-center lg:justify-between lg:gap-10">
              <div
                className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_right,rgba(70,87,143,.35),transparent_66%)]"
                aria-hidden
              />
              <div className="relative">
                <h2 className="font-display text-2xl font-bold sm:text-3xl">
                  Ready to Borrow with Confidence?
                </h2>
                <p className="mt-2 text-on-dark-muted">
                  Explore borrowing solutions that are tailored to your needs.
                </p>
              </div>
              <div className="relative mt-6 grid gap-3 min-[480px]:flex min-[480px]:flex-wrap lg:mt-0">
                <Button size="lg" asChild className="w-full min-[480px]:w-auto">
                  <Link href="/enquiry">
                    <Headset className="h-4 w-4" aria-hidden />
                    Talk to a Borrowing Advisor
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline-inverse"
                  asChild
                  className="w-full min-[480px]:w-auto"
                >
                  <a href={site.whatsappHref} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4" aria-hidden />
                    WhatsApp Us
                  </a>
                </Button>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
