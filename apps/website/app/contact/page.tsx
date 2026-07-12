import type { Metadata } from "next";
import { Phone, Mail, MapPin, Clock, MessageCircle } from "lucide-react";
import { Card, Container } from "@truelend/ui";
import { PageHeader } from "@/components/page-header";
import { ContactForm } from "@/components/forms/contact-form";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Call, WhatsApp or write to the TrueLend team — we reply within a working day.",
};

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact us"
        title="Talk to a person, not a portal"
        lede="Questions about a product, an ongoing application, or a partnership — reach us any way you like."
      />
      <Container className="grid gap-8 py-16 sm:py-20 lg:grid-cols-[0.75fr_1.25fr]">
        <Card className="h-fit p-7">
          <h2 className="font-display text-lg font-bold text-navy-950">Reach us directly</h2>
          <ul className="mt-5 space-y-4 text-sm text-navy-700">
            <li>
              <a href={site.phoneHref} className="flex items-center gap-3 hover:text-navy-950">
                <Phone className="h-4 w-4 shrink-0 text-red-600" aria-hidden />
                {site.phone}
              </a>
            </li>
            <li>
              <a
                href={site.whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 hover:text-navy-950"
              >
                <MessageCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden />
                WhatsApp us
              </a>
            </li>
            <li>
              <a
                href={`mailto:${site.email}`}
                className="flex items-center gap-3 hover:text-navy-950"
              >
                <Mail className="h-4 w-4 shrink-0 text-red-600" aria-hidden />
                {site.email}
              </a>
            </li>
            <li className="flex items-center gap-3">
              <MapPin className="h-4 w-4 shrink-0 text-red-600" aria-hidden />
              {site.address}
            </li>
            <li className="flex items-center gap-3">
              <Clock className="h-4 w-4 shrink-0 text-red-600" aria-hidden />
              {site.hours}
            </li>
          </ul>
        </Card>
        <Card className="p-7 sm:p-9">
          <ContactForm />
        </Card>
      </Container>
    </>
  );
}
