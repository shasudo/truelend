import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { canonical, jsonLd } from "@/lib/metadata";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://truelend.in"),
  title: {
    default: "TrueLend — Lending Choices, Simplified.",
    template: "%s — TrueLend",
  },
  description:
    "TrueLend helps you make the right borrowing decision by matching your financial profile with lenders whose policies best fit your needs.",
  alternates: { canonical: "/" },
  openGraph: {
    siteName: "TrueLend",
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const organization = {
    "@context": "https://schema.org",
    "@type": ["Organization", "FinancialService"],
    name: "TrueLend",
    url: canonical("/"),
    logo: canonical("/icon.svg"),
    description:
      "Loan comparison and borrower advisory across banks and non-banking financial companies in India.",
  };
  return (
    <html lang="en" className={`${bricolage.variable} ${instrument.variable}`}>
      <body className="flex min-h-screen flex-col bg-paper font-sans text-navy-900 antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(organization) }}
        />
        {/* Scroll-reveal content is SSR'd at opacity:0; keep it visible without JS. */}
        <noscript>
          <style>{`.tl-reveal{opacity:1 !important;transform:none !important}`}</style>
        </noscript>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-navy-800 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
        >
          Skip to content
        </a>
        <Header />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer />
        {/* Cloudflare Web Analytics — set NEXT_PUBLIC_CF_BEACON_TOKEN in
            apps/website/.env (build-time). Absent = no beacon, no-op. */}
        {process.env.NEXT_PUBLIC_CF_BEACON_TOKEN && (
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={`{"token": "${process.env.NEXT_PUBLIC_CF_BEACON_TOKEN}"}`}
          />
        )}
      </body>
    </html>
  );
}
