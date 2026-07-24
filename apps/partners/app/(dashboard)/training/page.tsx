import Link from "next/link";
import { ArrowRight, BadgeCheck, ClipboardCheck, GraduationCap, ShieldCheck } from "lucide-react";
import { Button, Card } from "@truelend/ui";
import { PartnerPageHeader } from "@/components/partner-page-header";
import { requirePartner } from "@/lib/auth";

export const dynamic = "force-dynamic";

const referralModules = [
  {
    icon: GraduationCap,
    title: "Spot a genuine need",
    description:
      "Listen for people actively exploring a loan and offer an introduction without pressure.",
    points: ["Start with people you know", "Explain TrueLend’s role", "Ask before sharing details"],
  },
  {
    icon: ClipboardCheck,
    title: "Make a good referral",
    description: "A name, mobile number and basic loan need are enough for TrueLend to begin.",
    points: ["Use correct details", "Choose the closest product", "Add helpful context only"],
  },
  {
    icon: ShieldCheck,
    title: "Refer responsibly",
    description:
      "Keep the experience helpful and transparent while the TrueLend team handles the process.",
    points: ["No approval promises", "No upfront investment", "Track status in your dashboard"],
  },
];

export default async function TrainingPage() {
  await requirePartner();

  return (
    <div className="mx-auto max-w-6xl">
      <PartnerPageHeader
        eyebrow="Learn the basics"
        title="Learn & Earn"
        description="No lending experience required—learn how to make useful, consent-led introductions."
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {referralModules.map((module, index) => (
          <Card key={module.title} className="p-6">
            <div className="flex items-center justify-between gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-800 text-sun-400">
                <module.icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="font-display text-2xl font-extrabold text-navy-200">
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>
            <h2 className="mt-5 font-display text-xl font-bold text-navy-950">{module.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-navy-600">{module.description}</p>
            <ul className="mt-5 space-y-2.5 text-sm text-navy-700">
              {module.points.map((point) => (
                <li key={point} className="flex gap-2.5">
                  <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
                  {point}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <section className="mt-6 flex flex-col items-start justify-between gap-5 rounded-2xl bg-navy-900 p-6 text-white sm:flex-row sm:items-center sm:p-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-sun-400">
            Ready to act?
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold">
            Make your first helpful introduction.
          </h2>
        </div>
        <Button asChild className="shrink-0">
          <Link href="/refer">
            Refer Someone
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </section>
    </div>
  );
}

export const metadata = { title: "Learn and earn" };
