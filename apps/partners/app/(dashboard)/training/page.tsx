import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  ClipboardCheck,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";
import { Button, Card } from "@truelend/ui";
import { PartnerPageHeader } from "@/components/partner-page-header";
import { requirePartner } from "@/lib/auth";

export const dynamic = "force-dynamic";

const businessModules = [
  {
    icon: ClipboardCheck,
    title: "Build a complete case",
    description:
      "Confirm customer intent, product need, contact details and relevant context before submitting.",
    points: ["Capture consent", "Add accurate contact details", "Include useful case notes"],
  },
  {
    icon: BookOpenCheck,
    title: "Understand the pipeline",
    description:
      "Use lead and loan-case status to set clear expectations without overpromising outcomes.",
    points: ["Track milestones", "Follow document readiness", "Escalate through support"],
  },
  {
    icon: ShieldCheck,
    title: "Work responsibly",
    description:
      "Protect customer information and keep every claim accurate, clear and consent-led.",
    points: ["Use the secure portal", "Never promise approval", "Avoid collecting excess data"],
  },
];

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
  const { partner } = await requirePartner();
  const business = partner!.type === "business";
  const modules = business ? businessModules : referralModules;

  return (
    <div className="mx-auto max-w-6xl">
      <PartnerPageHeader
        eyebrow={business ? "Partner training" : "Learn the basics"}
        title={business ? "Training" : "Learn & Earn"}
        description={
          business
            ? "Practical guidance for better case quality, cleaner coordination and responsible sourcing."
            : "No lending experience required—learn how to make useful, consent-led introductions."
        }
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {modules.map((module, index) => (
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
            {business
              ? "Turn your next opportunity into a complete case."
              : "Make your first helpful introduction."}
          </h2>
        </div>
        <Button asChild className="shrink-0">
          <Link href={business ? "/leads" : "/refer"}>
            {business ? "Submit New Loan Case" : "Refer Someone"}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </section>
    </div>
  );
}

export const metadata = { title: "Training" };
