import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import { appUrls } from "@truelend/reference";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(appUrls.partners),
  title: {
    default: "TrueLend Partners",
    template: "%s — TrueLend Partners",
  },
  description:
    "Partner with TrueLend — distribute loans, refer customers, earn on every disbursal.",
  alternates: { canonical: "/" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${inter.variable}`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-screen bg-paper font-sans text-navy-900 antialiased">{children}</body>
    </html>
  );
}
