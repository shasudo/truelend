import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  Clock3,
  ExternalLink,
  Handshake,
  Headphones,
  Headset,
  Mail,
  MapPin,
  Megaphone,
  MessageCircle,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { Button, Card, Container } from "@truelend/ui";
import { ContactForm } from "@/components/forms/contact-form";
import { Reveal } from "@/components/reveal";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Contact TrueLend for borrowing guidance, an existing enquiry, a partnership opportunity or general support.",
  alternates: { canonical: "/contact" },
};

const heroAssurances = ["Trusted guidance", "Quick response", "Personal attention", "Your success"];

const departments = [
  {
    icon: Headphones,
    title: "Customer Support",
    email: "support@truelend.in",
    note: "For general assistance",
  },
  {
    icon: Handshake,
    title: "Partnerships",
    email: "partner@truelend.in",
    note: "For partnership enquiries",
  },
  {
    icon: BriefcaseBusiness,
    title: "Careers",
    email: "careers@truelend.in",
    note: "Join our team",
  },
  {
    icon: Megaphone,
    title: "Media & Press",
    email: "media@truelend.in",
    note: "Media-related queries",
  },
];

interface ContactMethodProps {
  icon: LucideIcon;
  title: string;
  value: string;
  note: string;
  href?: string;
  external?: boolean;
  whatsapp?: boolean;
}

function ContactMethod({
  icon: Icon,
  title,
  value,
  note,
  href,
  external,
  whatsapp,
}: ContactMethodProps) {
  const content = (
    <>
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${whatsapp ? "bg-white text-navy-800 ring-1 ring-navy-100" : "bg-red-50 text-red-600"}`}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display font-bold text-navy-950">{title}</span>
        <span className="mt-0.5 block break-words text-sm font-semibold text-navy-800">
          {value}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-navy-600">{note}</span>
      </span>
      {href && <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden />}
    </>
  );

  const className =
    "flex items-center gap-4 rounded-xl border border-hairline bg-white px-4 py-3.5 transition-colors hover:border-navy-800/30 hover:bg-paper";

  return href ? (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={className}
    >
      {content}
    </a>
  ) : (
    <div className={className}>{content}</div>
  );
}

export default function ContactPage() {
  const coordinates = `${site.location.latitude},${site.location.longitude}`;
  const directionsHref = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(coordinates)}`;
  const mapRadius = 0.018;
  const mapBounds = [
    site.location.longitude - mapRadius,
    site.location.latitude - mapRadius,
    site.location.longitude + mapRadius,
    site.location.latitude + mapRadius,
  ].join(",");
  const mapEmbedHref = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(mapBounds)}&layer=mapnik&marker=${encodeURIComponent(coordinates)}`;

  return (
    <>
      <section className="overflow-hidden bg-[linear-gradient(135deg,#ffffff_0%,#faf8f3_70%,#fdeced_100%)]">
        <Container className="grid min-h-[25rem] items-center gap-6 py-12 lg:grid-cols-[1fr_1.1fr] lg:py-10">
          <Reveal immediate className="relative z-10 max-w-xl">
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-red-600">
              Contact TrueLend
            </p>
            <h1 className="mt-3 text-balance font-display text-5xl font-extrabold tracking-tight text-navy-950 sm:text-6xl">
              Contact TrueLend
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-8 text-navy-700">
              Whether you have a question about our borrowing solutions, an existing enquiry, a
              partnership opportunity or anything else, our team is happy to assist you.
            </p>
          </Reveal>

          <Reveal immediate delay={0.08} className="relative min-h-72 overflow-hidden sm:min-h-80">
            <Image
              src="/images/pages/contact-support-hero.webp"
              alt="Customer support headset beside a laptop and plant"
              fill
              priority
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="object-cover object-center"
            />
            <ul className="absolute right-[13%] top-[22%] hidden space-y-2.5 rounded-xl bg-white/90 p-4 text-sm font-semibold text-navy-950 shadow-[0_18px_40px_-24px_rgba(7,13,36,0.5)] backdrop-blur-sm sm:block">
              {heroAssurances.map((assurance) => (
                <li key={assurance} className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-red-600 text-red-600">
                    <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                  </span>
                  {assurance}
                </li>
              ))}
            </ul>
          </Reveal>
        </Container>
      </section>

      <Container className="py-12 sm:py-16">
        <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
          <Reveal>
            <Card className="h-full p-6 sm:p-7">
              <h2 className="font-display text-2xl font-bold text-navy-950">Reach Us Directly</h2>
              <span className="mt-3 block h-0.5 w-12 bg-red-600" aria-hidden />
              <div className="mt-5 space-y-3">
                <ContactMethod
                  icon={Phone}
                  title="Phone"
                  value={site.phone}
                  note={site.hours}
                  href={site.phoneHref}
                />
                <ContactMethod
                  icon={MessageCircle}
                  title="WhatsApp"
                  value={site.phone}
                  note="Chat with us directly"
                  href={site.whatsappHref}
                  external
                  whatsapp
                />
                <ContactMethod
                  icon={Mail}
                  title="Email"
                  value={site.email}
                  note="We typically respond within one working day"
                  href={`mailto:${site.email}`}
                />
                <ContactMethod
                  icon={MapPin}
                  title="Office"
                  value={site.address}
                  note="Get directions on the map below"
                  href={directionsHref}
                  external
                />
                <ContactMethod
                  icon={Clock3}
                  title="Working Hours"
                  value="Monday – Saturday"
                  note={site.hours.replace("Mon–Sat · ", "")}
                />
              </div>

              <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-5">
                <div className="flex gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-red-600">
                    <Headset className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <p className="font-display font-bold text-navy-950">Need borrowing advice?</p>
                    <p className="mt-1 text-sm leading-6 text-navy-600">
                      Looking for the right loan or expert guidance? Our Borrowing Advisors are here
                      to help you.
                    </p>
                    <Link
                      href="/enquiry"
                      className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-red-600 hover:text-red-700"
                    >
                      Talk to a Borrowing Advisor
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          </Reveal>

          <Reveal delay={0.08}>
            <Card className="h-full p-6 sm:p-8">
              <h2 className="font-display text-2xl font-bold text-navy-950">Send us a Message</h2>
              <span className="mt-3 block h-0.5 w-12 bg-red-600" aria-hidden />
              <div className="mt-6">
                <ContactForm />
              </div>
            </Card>
          </Reveal>
        </div>

        <Reveal>
          <Card className="mt-6 p-6 sm:p-7">
            <h2 className="font-display text-xl font-bold text-navy-950">Department Contacts</h2>
            <span className="mt-2 block h-0.5 w-10 bg-red-600" aria-hidden />
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {departments.map(({ icon: Icon, title, email, note }) => (
                <a
                  key={title}
                  href={`mailto:${email}`}
                  className="flex items-center gap-3 rounded-xl bg-navy-50/60 p-4 transition-colors hover:bg-navy-50"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display text-sm font-bold text-navy-950">
                      {title}
                    </span>
                    <span className="mt-1 block break-all text-xs font-semibold text-navy-800">
                      {email}
                    </span>
                    <span className="mt-1 block text-xs text-navy-600">{note}</span>
                  </span>
                </a>
              ))}
            </div>
          </Card>
        </Reveal>

        <Reveal>
          <Card className="mt-6 overflow-hidden p-3 sm:p-4">
            <div className="px-3 pb-3 pt-2 sm:px-4">
              <h2 className="font-display text-xl font-bold text-navy-950">Our Location</h2>
              <span className="mt-2 block h-0.5 w-10 bg-red-600" aria-hidden />
            </div>
            <div className="relative min-h-72 overflow-hidden rounded-lg bg-navy-50">
              <iframe
                title="Interactive map showing the TrueLend location"
                src={mapEmbedHref}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0 h-full w-full border-0"
              />
              <div className="absolute bottom-4 left-4 top-4 flex w-[min(18rem,calc(100%-2rem))] flex-col justify-center rounded-xl bg-white/95 p-5 shadow-[0_16px_40px_-26px_rgba(7,13,36,0.55)] backdrop-blur-sm sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2">
                <p className="flex items-center gap-2 font-display text-lg font-bold text-navy-950">
                  <MapPin className="h-5 w-5 text-red-600" aria-hidden />
                  TrueLend
                </p>
                <p className="mt-3 text-sm leading-6 text-navy-600">{site.address}</p>
                <a
                  href={directionsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-red-600 hover:text-red-700"
                >
                  Get Directions
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              </div>
            </div>
          </Card>
        </Reveal>
      </Container>

      <section className="border-y border-red-100 bg-red-50">
        <Container className="flex flex-col items-start gap-6 py-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-red-600">
              <ShieldCheck className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <h2 className="font-display text-xl font-bold text-navy-950">Still need help?</h2>
              <p className="mt-1 text-sm text-navy-600">
                We&rsquo;re here to make your borrowing journey simple and stress-free.
              </p>
            </div>
          </div>
          <div className="flex w-full flex-wrap gap-3 lg:w-auto">
            <Button asChild>
              <Link href="/enquiry">
                <Phone className="h-4 w-4" aria-hidden />
                Talk to a Borrowing Advisor
              </Link>
            </Button>
            <Button variant="outline" asChild className="bg-white">
              <a href={site.whatsappHref} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" aria-hidden />
                WhatsApp Us
              </a>
            </Button>
            <Button variant="outline" asChild className="bg-white">
              <a href={site.phoneHref}>
                <Phone className="h-4 w-4" aria-hidden />
                Call Us
              </a>
            </Button>
          </div>
        </Container>
      </section>
    </>
  );
}
