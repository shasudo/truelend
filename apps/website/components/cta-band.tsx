import Link from "next/link";
import { Headset, MessageCircle } from "lucide-react";
import { Button, Container, HexPattern } from "@truelend/ui";
import { site } from "@/content/site";

export interface CtaBandProps {
  headline?: string;
  sub?: string;
  href?: string;
}

export function CtaBand({
  headline = "Ready to make a smarter borrowing decision?",
  sub = "Our experts are ready to guide you — free, and on your side of the table.",
  href = "/enquiry",
}: CtaBandProps) {
  return (
    <section className="relative overflow-hidden bg-navy-900 text-white">
      <HexPattern className="-left-28 -top-44 h-[420px] w-[420px] text-white/[0.06]" />
      <Container className="flex flex-col items-start gap-8 py-16 sm:py-20 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <h2 className="text-balance font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            {headline}
          </h2>
          <p className="mt-3 text-white/65">{sub}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button size="lg" asChild>
            <Link href={href}>
              <Headset className="h-4 w-4" aria-hidden />
              Speak to an Advisor
            </Link>
          </Button>
          <Button size="lg" variant="outline-inverse" asChild>
            <a href={site.whatsappHref} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4" aria-hidden />
              WhatsApp Us
            </a>
          </Button>
        </div>
      </Container>
    </section>
  );
}
