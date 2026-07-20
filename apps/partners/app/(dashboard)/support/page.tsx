import Link from "next/link";
import { CircleHelp, FileCheck2, FolderKanban, Mail, ShieldCheck } from "lucide-react";
import { Button, Card } from "@truelend/ui";
import { PartnerPageHeader } from "@/components/partner-page-header";
import { requirePartner } from "@/lib/auth";

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
    description: "Keep your partner and contact information accurate from your profile.",
    href: "/profile",
    action: "Open profile",
  },
];

export default async function SupportPage() {
  const { partner } = await requirePartner();
  const business = partner.type === "business";

  return (
    <div className="mx-auto max-w-6xl">
      <PartnerPageHeader
        eyebrow="TrueLend Partner Support"
        title="How can we help?"
        description={
          business
            ? "Use your live dashboard first, then contact the support team for help with a case or account."
            : "TrueLend handles the loan journey. You can focus on the introduction and ask us whenever you need help."
        }
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {topics.map((topic) => (
          <Card key={topic.title} className="p-6">
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
              Email the TrueLend team from your registered address so we can identify your partner
              account.
            </p>
          </div>
          <div className="flex flex-col items-start justify-center p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-800 text-sun-400">
                <Mail className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
                  Email support
                </p>
                <a
                  href="mailto:loans@truelend.in"
                  className="font-display text-lg font-bold text-navy-950 hover:text-red-600"
                >
                  loans@truelend.in
                </a>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-navy-600">
              Include only the minimum details needed. Never email passwords, bank credentials or
              KYC files.
            </p>
            <Button asChild className="mt-5">
              <a href="mailto:loans@truelend.in?subject=TrueLend%20Partner%20Support">
                Email Partner Support
              </a>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export const metadata = { title: "Partner support" };
