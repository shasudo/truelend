import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, BookOpen, Megaphone, HelpCircle } from "lucide-react";
import { Button, Card, Container, SectionHeading } from "@truelend/ui";
import { PublicHeader } from "@/components/public-header";

export const metadata: Metadata = {
  title: "Partner resources",
  description: "Training, product guidelines and marketing collateral for TrueLend partners.",
  alternates: { canonical: "/resources" },
};

const sections = [
  {
    icon: GraduationCap,
    title: "Training",
    desc: "Practical, on-page guidance on responsible sourcing, useful referrals and using your dashboard.",
  },
  {
    icon: BookOpen,
    title: "Product guidelines",
    desc: "Simple guidance for collecting accurate customer needs and coordinating the next step.",
  },
  {
    icon: Megaphone,
    title: "Marketing collateral",
    desc: "Ready-to-use outreach ideas and WhatsApp messages inside your authenticated dashboard.",
  },
  {
    icon: HelpCircle,
    title: "Support",
    desc: "Status guidance, document help and a direct route to TrueLend Partner Support.",
  },
];

export default function ResourcesPage() {
  return (
    <>
      <PublicHeader />
      <main id="main-content" tabIndex={-1}>
        <section className="border-b border-hairline">
          <Container className="py-16 sm:py-20">
            <SectionHeading
              as="h1"
              eyebrow="Partner resources"
              title="Everything you need to sell with confidence"
              lede="Business and Referral Partners receive a tailored resource area after signing in."
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
              </Card>
            ))}
          </Container>
        </section>
        <section className="bg-navy-900 text-white">
          <Container className="flex flex-col items-start justify-between gap-6 py-12 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-display text-2xl font-bold">Access your partner toolkit</h2>
              <p className="mt-1 text-sm text-on-dark-muted">
                Sign in for role-specific marketing, training, tracking and support.
              </p>
            </div>
            <Button asChild>
              <Link href="/login">Partner sign in</Link>
            </Button>
          </Container>
        </section>
      </main>
    </>
  );
}
