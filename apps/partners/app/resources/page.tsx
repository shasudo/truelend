import type { Metadata } from "next";
import { GraduationCap, BookOpen, Megaphone, HelpCircle } from "lucide-react";
import { Card, Container, SectionHeading } from "@truelend/ui";
import { PublicHeader } from "@/components/public-header";

export const metadata: Metadata = {
  title: "Partner resources",
  description: "Training, product guidelines and marketing collateral for TrueLend partners.",
};

// Placeholder collateral — real training/decks/PDFs added by the TrueLend team.
const sections = [
  {
    icon: GraduationCap,
    title: "Training",
    desc: "Onboarding walkthroughs and short videos on sourcing, documentation and using your dashboard.",
  },
  {
    icon: BookOpen,
    title: "Product guidelines",
    desc: "Eligibility, documents and lender policies across home, business, personal and other loans.",
  },
  {
    icon: Megaphone,
    title: "Marketing collateral",
    desc: "Brochures, social creatives and WhatsApp-ready messages you can share with prospects.",
  },
  {
    icon: HelpCircle,
    title: "Support",
    desc: "How to reach your relationship manager and get help on live cases.",
  },
];

export default function ResourcesPage() {
  return (
    <>
      <PublicHeader />
      <section className="border-b border-hairline">
        <Container className="py-16 sm:py-20">
          <SectionHeading
            eyebrow="Partner resources"
            title="Everything you need to sell with confidence"
            lede="Content is being added by the TrueLend team. Check back soon — or ask your relationship manager for the latest materials."
          />
        </Container>
      </section>
      <section>
        <Container className="grid gap-4 py-16 sm:grid-cols-2">
          {sections.map((s) => (
            <Card key={s.title} className="p-7">
              <s.icon className="h-6 w-6 text-red-600" aria-hidden />
              <h2 className="mt-4 font-display text-lg font-bold text-navy-950">{s.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-navy-600">{s.desc}</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.1em] text-navy-300">
                Coming soon
              </p>
            </Card>
          ))}
        </Container>
      </section>
    </>
  );
}
