import {
  BadgeIndianRupee,
  BookOpenCheck,
  ChartNoAxesCombined,
  ChevronRight,
  Headset,
  Shapes,
} from "lucide-react";
import { Card } from "@truelend/ui";

const benefits = [
  {
    icon: Shapes,
    title: "Support across loan needs",
    description: "Home, business, personal, vehicle, education and other customer requirements.",
  },
  {
    icon: Headset,
    title: "Partner Support Team",
    description: "Guidance on active cases, referrals and the next step in the process.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Transparent tracking",
    description: "Follow introductions, case progress and earnings from your dashboard.",
  },
  {
    icon: BadgeIndianRupee,
    title: "Path-based earnings",
    description: "Business commissions or referral rewards based on how you partner.",
  },
  {
    icon: BookOpenCheck,
    title: "Resources to grow",
    description: "Practical marketing materials, role-based learning and ongoing support.",
  },
];

export function PartnerBenefitsPanel() {
  return (
    <Card className="h-fit overflow-hidden xl:sticky xl:top-20">
      <div className="bg-navy-900 px-6 py-5 text-white">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-sun-400">
          Partner advantage
        </p>
        <h3 className="mt-1 font-display text-xl font-bold">Why partner with TrueLend?</h3>
      </div>
      <ul className="divide-y divide-hairline px-5">
        {benefits.map((benefit) => (
          <li key={benefit.title} className="group flex gap-3 py-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
              <benefit.icon className="h-4.5 w-4.5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-navy-950">{benefit.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-navy-600">{benefit.description}</p>
            </div>
            <ChevronRight
              className="mt-2 h-4 w-4 shrink-0 text-navy-300 transition-transform group-hover:translate-x-0.5 group-hover:text-red-600"
              aria-hidden
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}
