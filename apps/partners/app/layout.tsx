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
    default: "TrueLend Referral Partners",
    template: "%s — TrueLend Referral Partners",
  },
  description:
    "Become a TrueLend Referral Partner — refer borrowers and earn after successful disbursals.",
  alternates: { canonical: "/" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${inter.variable}`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-screen min-w-0 overflow-x-clip bg-paper font-sans text-navy-900 antialiased">
        {children}
      </body>
    </html>
  );
}
