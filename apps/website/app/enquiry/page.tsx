import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  Clock,
  GitCompare,
  IndianRupee,
  Lock,
  MessageCircle,
  MessageSquare,
  Phone,
  PhoneCall,
  Rocket,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Accordion, Button, Card, Container } from "@truelend/ui";
import { isProductSlug } from "@truelend/reference";
import { PageHeader } from "@/components/page-header";
import { EnquiryForm } from "@/components/forms/enquiry-form";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Talk to a Borrowing Advisor",
  description:
    "Complete a short assessment and an experienced Borrowing Advisor compares suitable options across our partner banks, NBFCs and fintech lenders and calls you back within a working day.",
  alternates: { canonical: "/enquiry" },
};

const badges = [
  { icon: Clock, label: "Takes about 2 minutes" },
  { icon: IndianRupee, label: "No consultation fee" },
  { icon: BadgeCheck, label: "No obligation" },
  { icon: Lock, label: "Information handled securely" },
];

const nextSteps = [
  {
    icon: PhoneCall,
    title: "A Borrowing Advisor contacts you",
    desc: "Within one working day.",
  },
  {
    icon: UserRound,
    title: "We understand your requirement",
    desc: "Before we talk about lenders.",
  },
  {
    icon: GitCompare,
    title: "We compare suitable lending options",
    desc: "Across multiple banks, NBFCs & fintech lenders.",
  },
  {
    icon: MessageSquare,
    title: "We discuss recommendations",
    desc: "You get clear options to choose from.",
  },
  {
    icon: Rocket,
    title: "We support you till disbursement",
    desc: "End-to-end assistance at every step.",
  },
];

const whyItems = [
  "Advisor-led, unbiased guidance",
  "Multiple lending partners",
  "Transparent recommendations",
  "End-to-end support",
  "No consultation fee",
];

const faqs = [
  {
    q: "How soon will someone contact me?",
    a: "A Borrowing Advisor typically calls within one working day of your submission. To talk sooner, call or WhatsApp us on our number during business hours.",
  },
  {
    q: "Does applying through TrueLend affect my credit score?",
    a: "Submitting this assessment does not affect your credit score. A formal credit check happens only later, with your consent, once you choose to proceed with a specific lender.",
  },
  {
    q: "Do I have to pay any consultation fee?",
    a: "No. TrueLend's borrowing guidance is free for you. We are compensated by our lending partners only when a loan is successfully disbursed.",
  },
  {
    q: "Will you share my information with other parties?",
    a: "Your details are shared only with the lending partners relevant to your request, and only after your consent. We never sell your personal information.",
  },
  {
    q: "Can you help even if my application was rejected elsewhere?",
    a: "Often, yes. A past rejection does not mean every lender will decline. We compare policies across multiple banks, NBFCs and fintech lenders to find options that fit your profile.",
  },
  {
    q: "How many lenders do you compare with?",
    a: "We compare across a pan-India network of banks, NBFCs and fintech lenders, then shortlist the ones that best match your profile, eligibility and repayment capacity.",
  },
];

export default async function EnquiryPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string | string[] }>;
}) {
  const requested = (await searchParams).product;
  const requestedSlug = typeof requested === "string" ? requested : "";
  const defaultProduct = isProductSlug(requestedSlug) ? requestedSlug : "";

  return (
    <>
      <PageHeader
        eyebrow="Start your borrowing assessment"
        title="Let’s Find the Right Loan for You"
        lede="Complete this short assessment and one of our experienced Borrowing Advisors will understand your requirements, compare suitable lending options and guide you through every step of your borrowing journey."
      >
        {badges.map(({ icon: Icon, label }) => (
          <span
            key={label}
            className="inline-flex items-center gap-2 rounded-full border border-hairline bg-white px-4 py-2 text-sm font-medium text-navy-800"
          >
            <Icon className="h-4 w-4 shrink-0 text-red-600" aria-hidden />
            {label}
          </span>
        ))}
      </PageHeader>

      <Container className="grid gap-8 py-16 sm:py-20 lg:grid-cols-[1.35fr_0.8fr]">
        <Card className="p-7 sm:p-9">
          <EnquiryForm defaultProduct={defaultProduct} />
        </Card>

        <div className="space-y-4">
          <Card className="p-7">
            <h2 className="font-display text-lg font-bold text-navy-950">What happens next</h2>
            <ol className="mt-5 space-y-5">
              {nextSteps.map((s, i) => (
                <li key={s.title} className="flex gap-4">
                  <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-600 font-display text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <p className="flex items-center gap-2 font-semibold text-navy-950">
                      <s.icon className="h-4 w-4 shrink-0 text-red-600" aria-hidden />
                      {s.title}
                    </p>
                    <p className="mt-0.5 text-sm leading-relaxed text-navy-600">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          <Card className="border-red-100 bg-red-50/60 p-7">
            <h2 className="font-display text-lg font-bold text-navy-950">
              Why Borrowers Choose TrueLend
            </h2>
            <ul className="mt-4 space-y-3">
              {whyItems.map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-navy-800">
                  <Check className="h-4 w-4 shrink-0 text-red-600" strokeWidth={3} aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-7">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-navy-950">
              <ShieldCheck className="h-5 w-5 shrink-0 text-navy-500" aria-hidden />
              Your Information Matters
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-navy-600">
              We use your information only to assist with your borrowing request.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-navy-600">
              We never sell your personal information to anyone.
            </p>
            <Link
              href="/privacy"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-700"
            >
              Read our Privacy Policy
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Card>

          <Card className="p-7">
            <h2 className="font-display text-lg font-bold text-navy-950">
              Need immediate assistance?
            </h2>
            <p className="mt-1 text-sm text-navy-600">We’re here to help you.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="outline" size="sm" asChild>
                <a href={site.whatsappHref} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" aria-hidden />
                  WhatsApp Us
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={site.phoneHref}>
                  <Phone className="h-4 w-4" aria-hidden />
                  Call Us
                </a>
              </Button>
            </div>
            <p className="mt-4 font-display text-lg font-bold text-navy-950">{site.phone}</p>
            <p className="text-sm text-navy-600">{site.hours}</p>
          </Card>
        </div>
      </Container>

      <section className="bg-paper-deep/60">
        <Container className="py-16 sm:py-20">
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-navy-950 sm:text-3xl">
            Frequently Asked Questions
          </h2>
          <Accordion items={faqs} className="mt-8" />
        </Container>
      </section>

      <section>
        <Container className="py-12">
          <div className="flex flex-col items-start gap-5 rounded-2xl border border-red-100 bg-red-50/60 px-7 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <MessageSquare className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="font-display text-lg font-bold text-navy-950">
                  Still have questions?
                </p>
                <p className="mt-1 text-sm leading-relaxed text-navy-600">
                  Speak to one of our experienced Borrowing Advisors. We’ll understand your
                  requirement before recommending any lender.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Button asChild>
                <a href={site.phoneHref}>
                  <PhoneCall className="h-4 w-4" aria-hidden />
                  Speak to an Advisor
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={site.whatsappHref} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" aria-hidden />
                  WhatsApp Us
                </a>
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
