import type { Metadata } from "next";
import Link from "next/link";
import { CircleHelp, FileCheck2, FolderKanban, Mail, ShieldCheck } from "lucide-react";
import { Button, Card } from "@truelend/ui";
import { referralPartnerEmail } from "@truelend/reference";
import { PartnerPageHeader } from "@/components/partner-page-header";

export const metadata: Metadata = { title: "Referral partner support" };

export const dynamic = "force-dynamic";

const topics = [
  {
    icon: FolderKanban,
    title: "Case or referral update",
    description:
      "Check the current status first, then include the customer name when asking for help.",
    href: "/pipeline",
    action: "View status",
  },
  {
    icon: FileCheck2,
    title: "Verification documents",
    description: "Review your uploaded KYC documents and account verification state.",
    href: "/kyc",
    action: "View documents",
  },
  {
    icon: ShieldCheck,
    title: "Account details",
    description: "Keep your Referral Partner and contact information accurate from your profile.",
    href: "/profile",
    action: "Open profile",
  },
];

export default async function SupportPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PartnerPageHeader
        eyebrow="TrueLend Referral Partner Support"
        title="How can we help?"
        description="TrueLend handles the loan journey. You can focus on the introduction and ask us whenever you need help."
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {topics.map((topic) => (
          <Card key={topic.title} className="p-5 sm:p-6">
            <topic.icon className="h-6 w-6 text-red-600" aria-hidden />
            <h2 className="mt-4 font-display text-lg font-bold text-navy-950">{topic.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-navy-600">{topic.description}</p>
            <Link
              href={topic.href}
              className="mt-4 inline-block text-sm font-semibold text-navy-800 hover:text-red-600"
            >
              {topic.action} →
            </Link>
          </Card>
        ))}
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="grid md:grid-cols-[0.8fr_1.2fr]">
          <div className="bg-sun-400 p-6 sm:p-8">
            <CircleHelp className="h-8 w-8 text-red-600" aria-hidden />
            <h2 className="mt-4 font-display text-2xl font-extrabold text-navy-950">
              Still need support?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-navy-800">
              Email the TrueLend team from your registered address so we can identify your Referral
              Partner account.
            </p>
          </div>
          <div className="flex min-w-0 flex-col items-start justify-center p-5 sm:p-8">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-800 text-sun-400">
                <Mail className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
                  Email support
                </p>
                <a
                  href={`mailto:${referralPartnerEmail}`}
                  className="break-all font-display text-base font-bold text-navy-950 hover:text-red-600 min-[420px]:text-lg"
                >
                  {referralPartnerEmail}
                </a>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-navy-600">
              Include only the minimum details needed. Never email passwords, bank credentials or
              KYC files.
            </p>
            <Button
              asChild
              className="mt-5 h-auto min-h-11 w-full whitespace-normal py-3 sm:w-auto"
            >
              <a
                href={`mailto:${referralPartnerEmail}?subject=TrueLend%20Referral%20Partner%20Support`}
              >
                Email Referral Partner Support
              </a>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
