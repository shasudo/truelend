import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
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
  return (
    <html lang="en" className={`${bricolage.variable} ${instrument.variable}`}>
      <body className="flex min-h-screen flex-col bg-paper font-sans text-navy-900 antialiased">
        {/* Scroll-reveal content is SSR'd at opacity:0; keep it visible without JS. */}
        <noscript>
          <style>{`.tl-reveal{opacity:1 !important;transform:none !important}`}</style>
        </noscript>
        <Header />
        <main className="flex-1">{children}</main>
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
