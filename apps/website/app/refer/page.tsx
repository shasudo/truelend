import type { Metadata } from "next";
import { UserPlus, PhoneCall, Handshake } from "lucide-react";
import { Card, Container } from "@truelend/ui";
import { PageHeader } from "@/components/page-header";
import { ReferralForm } from "@/components/forms/referral-form";

export const metadata: Metadata = {
  title: "Refer a Friend",
  description:
    "Know someone hunting for a loan? Refer them to TrueLend — they get borrower-side advice, you stay in the loop.",
  alternates: { canonical: "/refer" },
};

const steps = [
  {
    icon: UserPlus,
    title: "Tell us who",
    desc: "Share your friend's name and number — with their knowledge.",
  },
  {
    icon: PhoneCall,
    title: "We call them gently",
    desc: "One introductory call, no pressure, no repeat dialling.",
  },
  {
    icon: Handshake,
    title: "They borrow smarter",
    desc: "Same advice standard you'd get — compared, honest, free.",
  },
];

export default function ReferPage() {
  return (
    <>
      <PageHeader
        eyebrow="Refer a friend"
        title="The best advice is the kind you pass on"
        lede="If someone you know is walking into a bank blind, point them here instead. We'll treat their file the way we'd treat yours."
      />
      <Container className="grid gap-8 py-16 sm:py-20 lg:grid-cols-[0.75fr_1.25fr]">
        <div className="space-y-5 lg:order-none">
          {steps.map((s, i) => (
            <Card key={s.title} className="flex gap-4 p-6">
              <span className="font-display text-xl font-extrabold tabular-nums text-red-600">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <p className="flex items-center gap-2 font-semibold text-navy-950">
                  <s.icon className="h-4 w-4 text-navy-500" aria-hidden />
                  {s.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-navy-600">{s.desc}</p>
              </div>
            </Card>
          ))}
        </div>
        <Card className="p-7 sm:p-9">
          <ReferralForm />
        </Card>
      </Container>
    </>
  );
}
