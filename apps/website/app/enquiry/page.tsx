import type { Metadata } from "next";
import { PhoneCall, SearchCheck, BadgeCheck, ShieldCheck } from "lucide-react";
import { Card, Container } from "@truelend/ui";
import { isProductSlug } from "@truelend/reference";
import { PageHeader } from "@/components/page-header";
import { EnquiryForm } from "@/components/forms/enquiry-form";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Customer Enquiry",
  description:
    "Tell us what you're borrowing for — an advisor compares offers across our partner banks and NBFCs and calls you back within a working day.",
  alternates: { canonical: "/enquiry" },
};

const nextSteps = [
  {
    icon: PhoneCall,
    title: "An advisor calls you",
    desc: "Within one working day, to understand the need behind the loan.",
  },
  {
    icon: SearchCheck,
    title: "We compare the market",
    desc: "Your profile mapped against live lender policies and pricing.",
  },
  {
    icon: BadgeCheck,
    title: "You choose with clarity",
    desc: "A shortlist with real numbers — and help until disbursal.",
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
        eyebrow="Customer enquiry"
        title="Start with a conversation, not an application"
        lede="No credit checks, no paperwork yet — just tell us what you're planning and we'll show you where the market stands for a profile like yours."
      />
      <Container className="grid gap-8 py-16 sm:py-20 lg:grid-cols-[1.25fr_0.75fr]">
        <Card className="p-7 sm:p-9">
          <EnquiryForm defaultProduct={defaultProduct} />
        </Card>
        <div className="space-y-4">
          <Card className="p-7">
            <h2 className="font-display text-lg font-bold text-navy-950">What happens next</h2>
            <ul className="mt-5 space-y-5">
              {nextSteps.map((s) => (
                <li key={s.title} className="flex gap-4">
                  <s.icon className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
                  <div>
                    <p className="font-semibold text-navy-950">{s.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-navy-600">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="flex items-start gap-4 p-7">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-navy-500" aria-hidden />
            <p className="text-sm leading-relaxed text-navy-600">
              Your details stay with TrueLend until you approve a lender. Prefer talking first? Call
              us on{" "}
              <a
                href={site.phoneHref}
                className="font-semibold text-navy-900 underline underline-offset-2"
              >
                {site.phone}
              </a>
              .
            </p>
          </Card>
        </div>
      </Container>
    </>
  );
}
