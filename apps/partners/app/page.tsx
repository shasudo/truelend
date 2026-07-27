import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeIndianRupee,
  BookOpenCheck,
  Building2,
  Check,
  CircleCheckBig,
  Clock3,
  FileCheck2,
  Gift,
  GraduationCap,
  Headset,
  HeartHandshake,
  LockKeyhole,
  Phone,
  Rocket,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserRoundPlus,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { Button, Card, Container } from "@truelend/ui";
import { appUrls, contactPhone, referralPartnerEmail } from "@truelend/reference";
import { LoanProductsSection } from "@/components/loan-products-section";
import { PublicHeader } from "@/components/public-header";

const journey = [
  {
    icon: UserRoundPlus,
    title: "You Refer",
    description: "Share borrower details in less than 30 seconds.",
    tone: "bg-navy-50 text-navy-700",
  },
  {
    icon: Headset,
    title: "TrueLend Advisor",
    description: "Our experts understand the requirement and guide the borrower.",
    tone: "bg-red-50 text-red-600",
  },
  {
    icon: Building2,
    title: "Right Bank / NBFC",
    description: "We match the borrower with a suitable lender.",
    tone: "bg-sun-100 text-navy-800",
  },
  {
    icon: CircleCheckBig,
    title: "Loan Disbursed",
    description: "The borrower receives the loan with complete support.",
    tone: "bg-navy-800 text-white",
  },
  {
    icon: Gift,
    title: "You Earn",
    description: "Receive a referral reward after successful disbursal.",
    tone: "bg-sun-100 text-sun-600",
  },
] as const;

const steps = [
  {
    icon: UserRoundPlus,
    title: "Know Someone Who Needs a Loan?",
    description: "Personal, home, business, education or any other loan.",
  },
  {
    icon: FileCheck2,
    title: "Share Their Details",
    description: "Submit basic details with consent in less than 30 seconds.",
  },
  {
    icon: Headset,
    title: "We Take It From Here",
    description: "Our advisors connect with the borrower and handle everything.",
  },
  {
    icon: Building2,
    title: "Loan Disbursed",
    description: "The borrower receives the right loan with complete support.",
  },
  {
    icon: Gift,
    title: "You Earn",
    description: "Receive your referral incentive after successful disbursal.",
  },
] as const;

const advantages = [
  {
    icon: ShieldCheck,
    title: "No Expertise Required",
    description: "You refer; our experienced team handles the rest.",
  },
  {
    icon: FileCheck2,
    title: "No Paperwork",
    description: "No documentation or lender follow-ups are needed from you.",
  },
  {
    icon: Smartphone,
    title: "Real-time Tracking",
    description: "Track every referral from your dashboard in real time.",
  },
  {
    icon: WalletCards,
    title: "Timely Rewards",
    description: "Transparent referral incentives recorded in one ledger.",
  },
  {
    icon: Headset,
    title: "Dedicated Support",
    description: "A referral-support team is always available to help.",
  },
  {
    icon: GraduationCap,
    title: "Learn & Grow",
    description: "Use training, insights and sharing tools to grow.",
  },
] as const;

const trustPoints = [
  "Experienced borrowing advisors",
  "Multiple lending banks and NBFCs",
  "Transparent referral tracking",
  "End-to-end loan support",
] as const;

const whoCanJoin = [
  "Salaried professionals",
  "Self-employed professionals",
  "Real-estate professionals",
  "Insurance and investment advisors",
  "Teachers, students and homemakers",
  "Retired professionals and community leaders",
] as const;

const benefits = [
  {
    icon: Rocket,
    title: "Start immediately",
    description: "Registration is quick and there are no joining fees or sales targets.",
  },
  {
    icon: HeartHandshake,
    title: "Help your network",
    description: "Give people you know a reliable introduction when they need a loan.",
  },
  {
    icon: BadgeIndianRupee,
    title: "Earn on success",
    description: "Eligible disbursals create a clear referral incentive in your dashboard.",
  },
  {
    icon: BookOpenCheck,
    title: "TrueLend handles the work",
    description: "Our advisors manage lender matching, coordination and follow-up.",
  },
] as const;

const faqs = [
  {
    question: "Do I need lending experience?",
    answer:
      "No. You only make a consent-led introduction. TrueLend’s borrowing advisors handle the loan journey.",
  },
  {
    question: "Is there a registration fee or target?",
    answer:
      "No. Joining is free, and the referral program has no mandatory sales target or upfront investment.",
  },
  {
    question: "When do I receive a referral incentive?",
    answer:
      "An eligible incentive is recorded after a referred borrower’s loan is successfully disbursed and verified by the TrueLend team.",
  },
  {
    question: "Can I track my referrals?",
    answer:
      "Yes. Your Referral Partner dashboard shows every submitted referral, its current stage and your recorded incentives.",
  },
] as const;

export default function Home() {
  return (
    <>
      <PublicHeader />

      <main id="main-content" tabIndex={-1}>
        <section className="overflow-hidden border-b border-hairline bg-white">
          <Container className="grid max-w-[1240px] items-center gap-8 py-10 lg:min-h-[438px] lg:grid-cols-[minmax(0,1.15fr)_minmax(190px,0.65fr)_minmax(230px,0.8fr)] lg:py-4 xl:grid-cols-[520px_210px_minmax(0,350px)]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-1.5 text-xs font-bold text-red-700">
                <Rocket className="h-3.5 w-3.5" aria-hidden />
                Now onboarding our first 1,000 Referral Partners
              </p>
              <h1 className="mt-4 break-words font-display text-[2.15rem] font-extrabold leading-[1.08] tracking-tight text-navy-950 min-[360px]:text-[2.4rem] sm:text-[2.65rem]">
                <span className="block">Help People</span>
                <span className="block xl:whitespace-nowrap">Get the Right Loan.</span>
                <span className="block text-red-600 xl:whitespace-nowrap">
                  Earn When They Succeed.
                </span>
              </h1>
              <p className="mt-4 max-w-[455px] text-sm leading-6 text-navy-600">
                Join the TrueLend Referral Network. Refer friends, family, colleagues or customers
                who need a loan. Our experienced advisors handle the entire borrowing journey—from
                lender selection to disbursal.
              </p>
              <div className="mt-5 grid gap-3 min-[480px]:flex min-[480px]:flex-wrap">
                <Button asChild className="w-full min-[480px]:w-auto">
                  <Link href="/register/referral">
                    Become a Referral Partner <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
                <Button variant="outline" asChild className="w-full min-[480px]:w-auto">
                  <a href="#how-it-works">Learn How It Works</a>
                </Button>
              </div>
              <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-navy-500">
                <LockKeyhole className="h-3.5 w-3.5" aria-hidden />
                Free to join <span aria-hidden>•</span> No registration fee{" "}
                <span aria-hidden>•</span> No hidden charges
              </p>
            </div>

            <ol className="relative space-y-3 lg:space-y-1">
              {journey.map((item, index) => (
                <li key={item.title} className="relative flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white shadow-sm ${item.tone}`}
                    >
                      <item.icon className="h-5 w-5" aria-hidden />
                    </span>
                    {index < journey.length - 1 && (
                      <span
                        className="mt-1 h-5 border-l border-dashed border-navy-300"
                        aria-hidden
                      />
                    )}
                  </div>
                  <div>
                    <h2 className="font-display text-sm font-bold text-navy-950">{item.title}</h2>
                    <p className="mt-0.5 text-xs font-medium leading-5 text-navy-600 lg:text-[0.7rem] lg:leading-4">
                      {item.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="relative mx-auto min-h-[420px] w-full max-w-[400px] self-end">
              <Image
                src="/images/referral-hero-v2.png"
                alt="A TrueLend Referral Partner using his phone"
                fill
                priority
                sizes="(min-width: 1024px) 400px, 70vw"
                className="object-contain object-bottom"
              />
              <Card className="absolute bottom-3 right-0 w-[220px] p-3.5 shadow-[0_20px_50px_-28px_rgba(7,13,36,0.8)]">
                <p className="flex items-center gap-2 font-display text-xs font-bold text-red-600">
                  <ShieldCheck className="h-4 w-4" aria-hidden /> Built on trust
                </p>
                <ul className="mt-2 space-y-1 text-xs text-navy-700">
                  {trustPoints.map((point) => (
                    <li key={point} className="flex gap-2">
                      <Check className="h-3.5 w-3.5 shrink-0 text-navy-700" aria-hidden />
                      {point}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </Container>
        </section>

        <LoanProductsSection />

        <section id="how-it-works" className="scroll-mt-20 border-b border-hairline bg-red-50/30">
          <Container className="max-w-[1240px] py-12 sm:py-14">
            <div className="text-center">
              <h2 className="font-display text-3xl font-extrabold text-navy-950 sm:text-4xl">
                How It Works
              </h2>
              <p className="mt-2 text-base text-navy-600">Simple steps. Maximum impact.</p>
            </div>
            <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {steps.map((step, index) => (
                <li
                  key={step.title}
                  className={`relative grid min-h-[168px] grid-cols-[52px_minmax(0,1fr)] gap-4 rounded-2xl border border-hairline bg-white p-5 shadow-sm xl:col-span-2 ${
                    index === 3 ? "xl:col-start-2" : ""
                  }`}
                >
                  <span className="absolute -top-3 left-4 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="flex h-13 w-13 items-center justify-center rounded-full bg-red-50 text-red-600">
                    <step.icon className="h-6 w-6" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <h3 className="break-words font-display text-lg font-bold leading-6 text-navy-950">
                      {step.title}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-navy-600">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-8 grid gap-4 rounded-2xl border border-hairline bg-white p-5 sm:grid-cols-2 lg:grid-cols-3">
              {advantages.map((advantage) => (
                <div
                  key={advantage.title}
                  className="grid min-h-[124px] grid-cols-[44px_1fr] gap-4 rounded-xl bg-red-50/50 p-4"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50">
                    <advantage.icon className="h-5 w-5 text-red-600" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <h3 className="break-words font-display text-base font-bold text-navy-950">
                      {advantage.title}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-navy-600">{advantage.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </section>

        <section id="why-truelend" className="scroll-mt-20">
          <Container className="grid max-w-[1380px] items-center gap-10 py-16 lg:grid-cols-2 lg:py-20">
            <div className="rounded-3xl bg-navy-950 p-7 text-white sm:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-sun-400">
                Why TrueLend
              </p>
              <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight min-[400px]:text-3xl sm:text-4xl">
                <strong className="font-extrabold">WHY BORROWERS CHOOSE TRUELEND</strong>
              </h2>
              <p className="mt-4 max-w-xl leading-relaxed text-on-dark-muted">
                Borrowers get one helpful point of contact, access to multiple lenders, clear
                guidance and end-to-end support without being left to navigate the process alone.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  icon: UsersRound,
                  title: "Human guidance",
                  text: "An experienced advisor understands each borrower’s requirement.",
                },
                {
                  icon: Building2,
                  title: "Multiple lenders",
                  text: "Suitable banks and NBFCs are compared for the borrower’s needs.",
                },
                {
                  icon: Clock3,
                  title: "Clear updates",
                  text: "Borrowers and referrers can follow progress without guesswork.",
                },
                {
                  icon: ShieldCheck,
                  title: "Consent-led support",
                  text: "Customer information is shared responsibly and only when needed.",
                },
              ].map((item) => (
                <Card key={item.title} className="p-5">
                  <item.icon className="h-6 w-6 text-red-600" aria-hidden />
                  <h3 className="mt-4 font-display font-bold text-navy-950">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-navy-600">{item.text}</p>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        <section id="who-can-join" className="scroll-mt-20 border-y border-hairline bg-white">
          <Container className="max-w-[1380px] py-16 sm:py-20">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-600">
                  Open to everyone
                </p>
                <h2 className="mt-2 font-display text-3xl font-extrabold text-navy-950">
                  Who Can Join?
                </h2>
                <p className="mt-4 leading-relaxed text-navy-600">
                  Anyone with a trusted personal or professional network can become a TrueLend
                  Referral Partner. Lending experience is not required.
                </p>
                <Button asChild className="mt-6">
                  <Link href="/register/referral">
                    Join the Referral Network <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2">
                {whoCanJoin.map((person) => (
                  <li
                    key={person}
                    className="flex items-center gap-3 rounded-xl border border-hairline bg-paper px-4 py-4 text-sm font-semibold text-navy-800"
                  >
                    <CircleCheckBig className="h-5 w-5 shrink-0 text-red-600" aria-hidden />
                    {person}
                  </li>
                ))}
              </ul>
            </div>
          </Container>
        </section>

        <section id="benefits" className="scroll-mt-20">
          <Container className="max-w-[1380px] py-16 sm:py-20">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-600">
                Referral Partner benefits
              </p>
              <h2 className="mt-2 font-display text-3xl font-extrabold text-navy-950">
                Help people. Build trust. Earn on success.
              </h2>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {benefits.map((benefit) => (
                <Card key={benefit.title} className="p-6">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
                    <benefit.icon className="h-6 w-6" aria-hidden />
                  </span>
                  <h3 className="mt-5 font-display text-lg font-bold text-navy-950">
                    {benefit.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-navy-600">
                    {benefit.description}
                  </p>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        <section id="faqs" className="scroll-mt-20 border-y border-hairline bg-white">
          <Container className="max-w-4xl py-16 sm:py-20">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-600">
                Common questions
              </p>
              <h2 className="mt-2 font-display text-3xl font-extrabold text-navy-950">FAQs</h2>
            </div>
            <div className="mt-8 divide-y divide-hairline rounded-2xl border border-hairline bg-paper px-5 sm:px-7">
              {faqs.map((faq) => (
                <details key={faq.question} className="group py-5">
                  <summary className="cursor-pointer list-none font-display font-bold text-navy-950">
                    <span className="flex items-center justify-between gap-4">
                      {faq.question}
                      <span className="text-xl text-red-600 group-open:rotate-45" aria-hidden>
                        +
                      </span>
                    </span>
                  </summary>
                  <p className="mt-3 max-w-3xl text-sm leading-relaxed text-navy-600">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </Container>
        </section>

        <section className="bg-navy-950 text-white">
          <Container className="flex max-w-[1380px] flex-col justify-between gap-8 py-12 lg:flex-row lg:items-center">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-sun-400">
                <Sparkles className="h-4 w-4" aria-hidden /> Ready to make an introduction?
              </p>
              <h2 className="mt-3 max-w-2xl font-display text-3xl font-extrabold">
                Become a TrueLend Referral Partner today.
              </h2>
              <p className="mt-3 text-sm text-on-dark-muted">
                Need help? Call or WhatsApp{" "}
                <a className="font-bold text-white" href={contactPhone.href}>
                  {contactPhone.display}
                </a>{" "}
                or email{" "}
                <a className="font-bold text-white" href={`mailto:${referralPartnerEmail}`}>
                  {referralPartnerEmail}
                </a>
                .
              </p>
            </div>
            <Button size="lg" asChild>
              <Link href="/register/referral">
                Become a Referral Partner <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </Container>
        </section>
      </main>

      <footer className="border-t border-hairline bg-white">
        <Container className="flex max-w-[1380px] flex-col items-center justify-between gap-4 py-7 text-sm text-navy-500 sm:flex-row">
          <p>© {new Date().getFullYear()} TrueLend. All rights reserved.</p>
          <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2" aria-label="Footer">
            <a
              href={contactPhone.href}
              className="inline-flex items-center gap-1 hover:text-navy-800"
            >
              <Phone className="h-4 w-4" aria-hidden /> {contactPhone.compact}
            </a>
            <a href={`mailto:${referralPartnerEmail}`} className="hover:text-navy-800">
              {referralPartnerEmail}
            </a>
            <Link href="/login" className="hover:text-navy-800">
              Referral Partner sign in
            </Link>
            <a href={`${appUrls.website}/terms`} className="hover:text-navy-800">
              Terms of Use
            </a>
            <a href={`${appUrls.website}/privacy`} className="hover:text-navy-800">
              Privacy Policy
            </a>
          </nav>
        </Container>
      </footer>
    </>
  );
}
