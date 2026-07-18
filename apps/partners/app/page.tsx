import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeIndianRupee,
  BookOpenCheck,
  Briefcase,
  BriefcaseBusiness,
  Building2,
  Car,
  ChartNoAxesCombined,
  CreditCard,
  FileCheck2,
  GraduationCap,
  Handshake,
  Headset,
  Home as HomeIcon,
  IndianRupee,
  Megaphone,
  ShieldCheck,
  Sparkles,
  Tractor,
  User,
  UserRoundPlus,
} from "lucide-react";
import { Button, Card, Container, HexPattern, SectionHeading } from "@truelend/ui";
import { PartnerBenefitsPanel } from "@/components/partner-benefits-panel";
import { PartnerPathCards } from "@/components/partner-path-cards";
import { PublicHeader } from "@/components/public-header";

const heroBenefits = [
  { icon: Headset, label: "Reliable support" },
  { icon: ChartNoAxesCombined, label: "Transparent tracking" },
  { icon: ShieldCheck, label: "Consent-led sharing" },
  { icon: Handshake, label: "Two partner paths" },
];

// Marketing display of the loans a partner can help people get. Names mirror
// the canonical @truelend/reference `products` set; icons match the website's
// product cards. Not linked — the header Products menu handles browsing.
const loanProducts = [
  {
    icon: User,
    name: "Personal Loan",
    blurb: "Quick funds for personal needs.",
    image: "/images/products/personal-loan.avif",
  },
  {
    icon: HomeIcon,
    name: "Home Loan",
    blurb: "Turn a dream home into reality.",
    image: "/images/products/home-loan.avif",
  },
  {
    icon: Briefcase,
    name: "Business Loan",
    blurb: "Fuel business growth and expansion.",
    image: "/images/products/business-loan.avif",
  },
  {
    icon: Building2,
    name: "Loan Against Property",
    blurb: "Unlock the value in owned property.",
    image: "/images/products/loan-against-property.avif",
  },
  {
    icon: CreditCard,
    name: "Credit Cards",
    blurb: "Everyday convenience and flexibility.",
    image: "/images/products/credit-cards.avif",
  },
  {
    icon: GraduationCap,
    name: "Education Loan",
    blurb: "Invest in a brighter future.",
    image: "/images/products/education-loan.avif",
  },
  {
    icon: Car,
    name: "Vehicle Loan",
    blurb: "Finance the right car or vehicle.",
    image: "/images/products/vehicle-loan.avif",
  },
  {
    icon: IndianRupee,
    name: "Working Capital",
    blurb: "Breathing room for the operating cycle.",
    image: "/images/products/working-capital.avif",
  },
  {
    icon: Tractor,
    name: "Equipment Finance",
    blurb: "Fund machines that pay for themselves.",
    image: "/images/products/equipment-finance.avif",
  },
];

const steps = [
  {
    icon: UserRoundPlus,
    title: "Join",
    description: "Choose the Business or Referral Partner path and create your account.",
  },
  {
    icon: FileCheck2,
    title: "Share or submit",
    description: "Refer someone or submit a complete customer loan opportunity.",
  },
  {
    icon: Headset,
    title: "We coordinate",
    description: "The TrueLend team connects with the customer and manages the next steps.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Track progress",
    description: "Follow every introduction and status update from your partner dashboard.",
  },
  {
    icon: BadgeIndianRupee,
    title: "Earn",
    description: "Eligible successful cases generate business commissions or referral rewards.",
  },
];

const assurances = [
  {
    icon: BriefcaseBusiness,
    title: "Purpose-built paths",
    description: "Different experiences for loan professionals and network-led referrers.",
  },
  {
    icon: ShieldCheck,
    title: "Responsible introductions",
    description: "Customer details are shared with consent through a secure partner portal.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Clear visibility",
    description: "Customers, referrals, statuses and earnings stay organized in one place.",
  },
  {
    icon: Headset,
    title: "Human support",
    description: "TrueLend coordinates the loan journey and helps partners when needed.",
  },
];

const resources = [
  {
    icon: Megaphone,
    title: "Marketing materials",
    description: "Ready-to-use outreach ideas and responsible sharing guidance.",
  },
  {
    icon: BookOpenCheck,
    title: "Partner learning",
    description:
      "Role-specific basics for better referrals, complete cases and clear expectations.",
  },
  {
    icon: Headset,
    title: "Partner support",
    description: "Guidance for account verification, live opportunities and referral questions.",
  },
];

export default function Home() {
  return (
    <>
      <PublicHeader />

      <main>
        <section className="relative overflow-hidden border-b border-hairline">
          <HexPattern className="-left-32 -top-24 h-[520px] w-[520px] text-navy-800/[0.04]" />
          <div className="absolute inset-y-0 right-0 hidden w-[58%] lg:block">
            <Image
              src="/images/partner-handshake-hero-branded.avif"
              alt="Two Indian business professionals shaking hands in a modern office"
              fill
              priority
              sizes="58vw"
              className="object-cover object-right"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(90deg,var(--color-paper)_0%,transparent_42%)]"
            />
          </div>
          <Container className="relative z-10 flex min-h-[650px] max-w-[1380px] items-center py-14 sm:py-20 lg:py-24">
            <div className="w-full max-w-2xl lg:max-w-[49%]">
              <p className="inline-flex items-center gap-2 rounded-full border border-navy-800/10 bg-navy-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-navy-800">
                <Handshake className="h-4 w-4 text-red-600" aria-hidden />
                Join the TrueLend Partner Network
              </p>
              <h1 className="mt-5 text-balance font-display text-5xl font-extrabold leading-[1.02] tracking-tight text-navy-950 sm:text-6xl">
                Help People Get The <span className="text-red-600">Right Loan.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-navy-600">
                Partner with TrueLend to help your family, friends, clients and contacts get the
                right loan from the right lender. We’ll take care of everything—from understanding
                their needs and matching them with the right lender to loan disbursement—while you
                strengthen relationships and earn for every successfully disbursed loan.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <a href="#partner-types">
                    Become a partner <ArrowRight className="h-4 w-4" aria-hidden />
                  </a>
                </Button>
              </div>

              <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                {heroBenefits.map((benefit) => (
                  <li
                    key={benefit.label}
                    className="flex items-center gap-2.5 text-xs font-semibold text-navy-700"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-hairline bg-white text-navy-700">
                      <benefit.icon className="h-4 w-4" aria-hidden />
                    </span>
                    {benefit.label}
                  </li>
                ))}
              </ul>

              <div className="relative mt-10 aspect-[2/1] overflow-hidden rounded-2xl border border-hairline bg-white shadow-[0_24px_60px_-40px_rgba(7,13,36,0.7)] lg:hidden">
                <Image
                  src="/images/partner-handshake-hero-branded.avif"
                  alt="Two Indian business professionals shaking hands in a modern office"
                  fill
                  priority
                  sizes="calc(100vw - 40px)"
                  className="object-cover object-center"
                />
              </div>
            </div>
          </Container>

          <div className="absolute bottom-10 right-8 z-20 hidden w-44 space-y-3 xl:block">
            {[
              { icon: Handshake, label: "Help your network", tone: "bg-white" },
              { icon: BadgeIndianRupee, label: "Earn by your path", tone: "bg-navy-50" },
              { icon: ShieldCheck, label: "We coordinate the rest", tone: "bg-sun-50" },
            ].map((item) => (
              <div
                key={item.label}
                className={`flex items-center gap-3 rounded-xl border border-hairline ${item.tone} p-3 shadow-[0_14px_32px_-24px_rgba(7,13,36,0.7)]`}
              >
                <item.icon className="h-5 w-5 shrink-0 text-red-600" aria-hidden />
                <span className="text-xs font-bold leading-tight text-navy-950">{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section
          id="loan-products"
          className="scroll-mt-16 border-b border-hairline bg-paper-deep/40"
        >
          <Container className="reveal max-w-[1380px] py-16 sm:py-20">
            <SectionHeading
              eyebrow="Loan products"
              title="Loan products you can help people get"
              lede="From personal and home loans to business finance and credit cards—introduce anyone to the product they need, and we match them with the right lender."
            />
            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {loanProducts.map((product) => (
                <div
                  key={product.name}
                  className="overflow-hidden rounded-xl border border-hairline bg-white"
                >
                  <div className="relative aspect-[3/2] overflow-hidden border-b border-hairline">
                    <Image
                      src={product.image}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 260px, (min-width: 640px) 33vw, 50vw"
                      className="object-cover object-center"
                    />
                    <span className="absolute bottom-3 left-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/90 text-navy-800 shadow-[0_12px_24px_-18px_rgba(7,13,36,0.8)] backdrop-blur-sm">
                      <product.icon className="h-5 w-5" aria-hidden />
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-display font-bold text-navy-950">{product.name}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-navy-600">{product.blurb}</p>
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </section>

        <section id="partner-types" className="scroll-mt-16">
          <Container className="reveal max-w-[1380px] py-16 sm:py-20">
            <SectionHeading
              eyebrow="Two ways to partner with TrueLend"
              title="Choose the right partnership"
              lede="Bring complete loan business as an experienced professional, or simply introduce people from your trusted network."
            />
            <div className="mt-10 grid gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(280px,1fr)]">
              <PartnerPathCards />
              <PartnerBenefitsPanel />
            </div>
          </Container>
        </section>

        <section
          id="how-it-works"
          className="scroll-mt-16 border-y border-hairline bg-paper-deep/55"
        >
          <Container className="reveal max-w-[1380px] py-16 sm:py-20">
            <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-600">
                  How it works
                </p>
                <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-navy-950">
                  Simple. Transparent. Partner-friendly.
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-navy-600">
                  The same five-step journey, adapted to your Business or Referral Partner path.
                </p>
              </div>
              <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {steps.map((step, index) => (
                  <li
                    key={step.title}
                    className="relative rounded-xl border border-hairline bg-white p-5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-50 text-navy-700">
                        <step.icon className="h-5 w-5" aria-hidden />
                      </span>
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                        {index + 1}
                      </span>
                    </div>
                    <h3 className="mt-4 font-display font-bold text-navy-950">{step.title}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-navy-600">
                      {step.description}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </Container>
        </section>

        <section id="benefits" className="scroll-mt-16">
          <Container className="reveal max-w-[1380px] py-16 sm:py-20">
            <SectionHeading
              eyebrow="Built for trust"
              title="A partner experience that stays clear at every step"
              lede="Useful tools, responsible sharing and human support—without making the portal harder than it needs to be."
            />
            <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {assurances.map((assurance) => (
                <Card key={assurance.title} className="p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sun-100 text-navy-800">
                    <assurance.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="mt-5 font-display text-lg font-bold text-navy-950">
                    {assurance.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-navy-600">
                    {assurance.description}
                  </p>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        <section className="border-y border-hairline bg-white">
          <Container className="reveal max-w-[1380px] py-16 sm:py-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-600">
                  Partner toolkit
                </p>
                <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-navy-950">
                  Resources that help you act with confidence
                </h2>
              </div>
              <Button variant="outline" asChild>
                <Link href="/resources">
                  Explore resources <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {resources.map((resource) => (
                <Card key={resource.title} className="flex gap-4 p-6">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-sun-400">
                    <resource.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-bold text-navy-950">
                      {resource.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-navy-600">
                      {resource.description}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        <section className="relative overflow-hidden bg-navy-900 text-white">
          <HexPattern className="-left-28 -top-44 h-[420px] w-[420px] text-white/[0.06]" />
          <Container className="reveal max-w-[1380px] py-14 sm:py-16">
            <div className="relative z-10">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-sun-400">
                <Sparkles className="h-4 w-4" aria-hidden /> Ready to get started?
              </p>
              <h2 className="mt-3 max-w-2xl text-balance font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                Join the TrueLend Partner Network and make your next introduction count.
              </h2>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <a href="#partner-types">
                    Become a partner <ArrowRight className="h-4 w-4" aria-hidden />
                  </a>
                </Button>
                <Button size="lg" variant="outline-inverse" asChild>
                  <Link href="/login">Partner sign in</Link>
                </Button>
              </div>
            </div>
          </Container>
        </section>
      </main>

      <footer className="border-t border-hairline">
        <Container className="flex max-w-[1380px] flex-col items-center justify-between gap-4 py-8 text-sm text-navy-500 sm:flex-row">
          <p>© {new Date().getFullYear()} TrueLend. All rights reserved.</p>
          <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2" aria-label="Footer">
            <Link href="/#partner-types" className="hover:text-navy-800">
              Partner types
            </Link>
            <Link href="/#how-it-works" className="hover:text-navy-800">
              How it works
            </Link>
            <Link href="/resources" className="hover:text-navy-800">
              Partner resources
            </Link>
            <Link href="/login" className="hover:text-navy-800">
              Sign in
            </Link>
          </nav>
        </Container>
      </footer>
    </>
  );
}
