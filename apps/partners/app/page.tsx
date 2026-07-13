import Link from "next/link";
import {
  Briefcase,
  UserRoundPlus,
  UserPlus,
  FileCheck2,
  BadgeCheck,
  IndianRupee,
} from "lucide-react";
import { Button, Card, Container, HexPattern, SectionHeading } from "@truelend/ui";
import { PublicHeader } from "@/components/public-header";

const paths = [
  {
    icon: Briefcase,
    title: "Business Partner",
    who: "For DSAs, agents and professionals who distribute financial products.",
    points: [
      "Source loans across 50+ lenders",
      "Bulk-upload leads",
      "Earn payout on every disbursal",
    ],
  },
  {
    icon: UserRoundPlus,
    title: "Referral Partner",
    who: "For anyone with a strong network who wants to refer and earn.",
    points: [
      "Refer from your personal network",
      "No paperwork to chase",
      "Earn incentives on disbursal",
    ],
  },
];

const steps = [
  {
    icon: UserPlus,
    title: "Register",
    desc: "Create your account as a business or referral partner.",
  },
  {
    icon: FileCheck2,
    title: "Upload KYC",
    desc: "Submit your documents — PAN, Aadhaar, cheque and more.",
  },
  {
    icon: BadgeCheck,
    title: "Get verified",
    desc: "Our team reviews and activates your account, usually in a day.",
  },
  {
    icon: IndianRupee,
    title: "Earn",
    desc: "Submit leads, we take them to disbursal, you get paid.",
  },
];

export default function Home() {
  return (
    <>
      <PublicHeader />

      <section className="relative overflow-hidden border-b border-hairline">
        <HexPattern className="-right-32 -top-24 h-[560px] w-[560px] text-navy-800/[0.05]" />
        <Container className="py-20 sm:py-28">
          <div className="max-w-2xl">
            <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-red-600">
              <span aria-hidden className="h-px w-8 bg-red-600" />
              TrueLend Partner Program
            </p>
            <h1 className="mt-5 text-balance font-display text-5xl font-extrabold leading-[1.03] tracking-tight text-navy-950 sm:text-6xl">
              Distribute loans or refer customers.{" "}
              <span className="text-red-600">Earn on every disbursal.</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-navy-600">
              Bring us the borrower; we bring 50+ banks and NBFCs, take the file to disbursal, and
              pay you transparently — all tracked on your own dashboard.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/register">Become a partner</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Partner sign in</Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>

      <section>
        <Container className="py-20 sm:py-24">
          <SectionHeading
            eyebrow="Two ways to partner"
            title="Pick the path that fits you"
            lede="Same platform, same transparency — different economics for how you work with us."
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {paths.map((p) => (
              <Card key={p.title} className="p-7">
                <p.icon className="h-6 w-6 text-red-600" aria-hidden />
                <h3 className="mt-4 font-display text-xl font-bold text-navy-950">{p.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-navy-600">{p.who}</p>
                <ul className="mt-4 space-y-2">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex gap-2.5 text-sm text-navy-700">
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
                      {pt}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-paper-deep/60">
        <Container className="py-20 sm:py-24">
          <SectionHeading eyebrow="How it works" title="From sign-up to payout" />
          <ol className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <li key={step.title} className="border-t border-hairline pt-5">
                <span className="font-display text-2xl font-extrabold tabular-nums text-red-600">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 flex items-center gap-2 font-display text-lg font-bold text-navy-950">
                  <step.icon className="h-4 w-4 text-navy-500" aria-hidden />
                  {step.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-navy-600">{step.desc}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="relative overflow-hidden bg-navy-900 text-white">
        <HexPattern className="-left-28 -top-44 h-[420px] w-[420px] text-white/[0.06]" />
        <Container className="flex flex-col items-start gap-8 py-16 sm:py-20 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="max-w-xl text-balance font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Ready to start earning with TrueLend?
          </h2>
          <Button size="lg" asChild>
            <Link href="/register">Create your partner account</Link>
          </Button>
        </Container>
      </section>

      <footer className="border-t border-hairline">
        <Container className="flex flex-col items-center justify-between gap-3 py-8 text-sm text-navy-500 sm:flex-row">
          <p>© {new Date().getFullYear()} TrueLend. All rights reserved.</p>
          <Link href="/resources" className="hover:text-navy-800">
            Partner resources
          </Link>
        </Container>
      </footer>
    </>
  );
}
