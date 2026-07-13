import Link from "next/link";
import { MoveUpRight, Phone, Mail, MapPin, Clock } from "lucide-react";
import { Container, Logo } from "@truelend/ui";
import { site } from "@/content/site";
import { products } from "@/content/products";

const companyLinks = [
  { label: "About Us", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "Refer a Friend", href: "/refer" },
  { label: "Free CIBIL Score (soon)", href: "/cibil-score" },
  { label: "Contact Us", href: "/contact" },
];

export function Footer() {
  return (
    <footer className="bg-navy-950 text-white">
      <div className="border-b border-white/10">
        <Container className="grid grid-cols-2 gap-x-8 gap-y-3 py-5 sm:grid-cols-4">
          {site.utilityStrip.map((item) => (
            <p key={item} className="flex items-center gap-2 text-sm text-on-dark-muted">
              <MoveUpRight className="h-3.5 w-3.5 shrink-0 text-red-500" aria-hidden />
              {item}
            </p>
          ))}
        </Container>
      </div>

      <Container className="grid gap-12 py-14 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <Link href="/" aria-label="TrueLend home" className="text-white">
            <Logo tagline />
          </Link>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-on-dark-muted">
            {site.tagline} We compare offers across India&rsquo;s leading banks and NBFCs and walk
            with you from enquiry to disbursement.
          </p>
        </div>

        <nav aria-label="Products">
          <h3 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-on-dark-muted">
            Products
          </h3>
          <ul className="mt-4 space-y-2.5">
            {products.slice(0, 6).map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/products/${p.slug}`}
                  className="text-sm text-on-dark-muted transition-colors hover:text-white"
                >
                  {p.name}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/products"
                className="inline-flex items-center gap-1 text-sm font-semibold text-red-500 transition-colors hover:text-red-200"
              >
                All products <MoveUpRight className="h-3 w-3" aria-hidden />
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Company">
          <h3 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-on-dark-muted">
            Company
          </h3>
          <ul className="mt-4 space-y-2.5">
            {companyLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-sm text-on-dark-muted transition-colors hover:text-white"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h3 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-on-dark-muted">
            Get in touch
          </h3>
          <ul className="mt-4 space-y-3 text-sm text-on-dark-muted">
            <li>
              <a href={site.phoneHref} className="flex items-center gap-2.5 hover:text-white">
                <Phone className="h-4 w-4 shrink-0 text-red-500" aria-hidden />
                {site.phone}
              </a>
            </li>
            <li>
              <a
                href={`mailto:${site.email}`}
                className="flex items-center gap-2.5 hover:text-white"
              >
                <Mail className="h-4 w-4 shrink-0 text-red-500" aria-hidden />
                {site.email}
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <MapPin className="h-4 w-4 shrink-0 text-red-500" aria-hidden />
              {site.address}
            </li>
            <li className="flex items-center gap-2.5">
              <Clock className="h-4 w-4 shrink-0 text-red-500" aria-hidden />
              {site.hours}
            </li>
          </ul>
        </div>
      </Container>

      <div className="border-t border-white/10">
        <Container className="space-y-4 py-6">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <p className="text-sm text-on-dark-muted">
              © {new Date().getFullYear()} TrueLend. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-on-dark-muted">
              <Link href="/privacy" className="hover:text-white">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-white">
                Terms of Use
              </Link>
            </div>
          </div>
          <p className="max-w-4xl text-xs leading-relaxed text-on-dark-muted">{site.disclaimer}</p>
        </Container>
      </div>
    </footer>
  );
}
