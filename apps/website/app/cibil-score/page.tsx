import type { Metadata } from "next";
import { Gauge, FileSearch, TrendingUp } from "lucide-react";
import { Badge, Card, Container, HexPattern } from "@truelend/ui";
import { NotifyForm } from "@/components/forms/notify-form";

export const metadata: Metadata = {
  title: "Free CIBIL Score — Coming Soon",
  description:
    "Free CIBIL score checks are coming to TrueLend. Leave your email and we'll tell you the day it goes live.",
};

const benefits = [
  {
    icon: Gauge,
    title: "Know where you stand",
    desc: "Your score decides your rate before any negotiation begins.",
  },
  {
    icon: FileSearch,
    title: "Catch errors early",
    desc: "Wrong entries on credit reports are common — and fixable before they cost you.",
  },
  {
    icon: TrendingUp,
    title: "Negotiate from strength",
    desc: "A 750+ score is leverage. We'll show you how to use it.",
  },
];

export default function CibilScorePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-hairline">
        <HexPattern className="-right-32 -top-40 h-[460px] w-[460px] text-navy-800/[0.06]" />
        <Container className="max-w-3xl py-20 text-center sm:py-28">
          <Badge variant="red" className="mx-auto">
            Coming soon
          </Badge>
          <h1 className="mt-5 text-balance font-display text-4xl font-extrabold tracking-tight text-navy-950 sm:text-5xl">
            Know your CIBIL score before the bank does.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-navy-600">
            Free score checks, straight from the bureau, with no impact on your credit history —
            launching on TrueLend shortly.
          </p>
          <Card className="mx-auto mt-10 max-w-xl p-7 text-left">
            <NotifyForm />
          </Card>
        </Container>
      </section>

      <section>
        <Container className="grid gap-4 py-16 sm:grid-cols-3 sm:py-20">
          {benefits.map((b) => (
            <Card key={b.title} className="p-6">
              <b.icon className="h-6 w-6 text-red-600" aria-hidden />
              <h2 className="mt-4 font-display text-lg font-bold text-navy-950">{b.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-navy-600">{b.desc}</p>
            </Card>
          ))}
        </Container>
      </section>
    </>
  );
}
