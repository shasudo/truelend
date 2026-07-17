import type { Metadata } from "next";
import { Scale, Handshake, BookOpenCheck, Route } from "lucide-react";
import { Card, Container } from "@truelend/ui";
import { PageHeader } from "@/components/page-header";
import { CtaBand } from "@/components/cta-band";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "TrueLend exists so borrowers stop paying for information asymmetry. Meet the philosophy behind 'Before You Borrow. Think TrueLend.'",
  alternates: { canonical: "/about" },
};

const values = [
  {
    icon: Scale,
    title: "Transparency first",
    desc: "The rate sheet we see is the rate sheet you see. Our compensation comes from lenders and is never hidden in your pricing.",
  },
  {
    icon: Handshake,
    title: "Borrower-side, always",
    desc: "We are not a lender's sales channel. Recommendations are ranked by your outcome — approval odds, total cost, terms you can live with.",
  },
  {
    icon: BookOpenCheck,
    title: "Policy-level expertise",
    desc: "Credit policies differ in ways brochures never show. Our advisors read them for a living so your file lands where it fits.",
  },
  {
    icon: Route,
    title: "Accountable end-to-end",
    desc: "From first conversation to disbursement — one team, one owner, no handoffs into the void.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About TrueLend"
        title="Before you borrow. Think TrueLend."
        lede="Most borrowers meet exactly one lender — the one whose branch was nearest — and accept the first sanction they get. We built TrueLend so that never has to happen again."
      />

      <section>
        <Container className="grid gap-12 py-20 sm:py-24 lg:grid-cols-[0.85fr_1.15fr]">
          <Reveal>
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-navy-950 sm:text-3xl">
              Why we exist
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="space-y-5 leading-relaxed text-navy-700">
              <p>
                Lending in India is a buyer&rsquo;s market that borrowers experience as a
                seller&rsquo;s market. Fifty-plus institutions compete for good files, yet the
                average borrower sees one offer, negotiates nothing, and never learns what the
                lender across the street would have quoted. The information asymmetry is the product
                — and borrowers pay for it in basis points, processing fees and rejected
                applications that scar their credit reports.
              </p>
              <p>
                TrueLend flips who the expertise works for. We study lender policies, map your
                profile against them, and take your file only where it genuinely fits — then we stay
                on it until the money is in your account. Lending choices, simplified; the right
                loan, from the right lender.
              </p>
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="bg-paper-deep/60">
        <Container className="py-20 sm:py-24">
          <Reveal>
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-navy-950 sm:text-3xl">
              What we hold ourselves to
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {values.map((v, i) => (
              <Reveal key={v.title} delay={(i % 2) * 0.08}>
                <Card className="h-full p-6">
                  <v.icon className="h-6 w-6 text-red-600" aria-hidden />
                  <h3 className="mt-4 font-display text-lg font-bold text-navy-950">{v.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-navy-600">{v.desc}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <CtaBand />
    </>
  );
}
