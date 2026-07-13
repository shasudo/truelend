import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { ArrowDown, BadgeCheck } from "lucide-react";
import { Button, Card, Container, HexPattern, SectionHeading } from "@truelend/ui";
import { PartnerPathCards } from "@/components/partner-path-cards";
import { PublicHeader } from "@/components/public-header";
import { RegisterForm } from "@/components/register-form";

export const metadata: Metadata = {
  title: "Become a partner",
  description: "Register as a TrueLend business or referral partner.",
  alternates: { canonical: "/register" },
};

// The Turnstile site key is a Worker runtime variable, so this page must not
// be statically generated at build time.
export const dynamic = "force-dynamic";

export default function RegisterPage() {
  const { env } = getCloudflareContext();

  return (
    <>
      <PublicHeader />

      <main>
        <section className="relative overflow-hidden border-b border-hairline">
          <HexPattern className="-left-44 -top-32 h-[520px] w-[520px] text-navy-800/[0.04]" />
          <Container className="grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.68fr)] lg:py-20">
            <div>
              <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-red-600">
                <span aria-hidden className="h-px w-8 bg-red-600" />
                TrueLend Partner Network™
              </p>
              <h1 className="mt-5 text-balance font-display text-4xl font-extrabold leading-tight tracking-tight text-navy-950 sm:text-5xl">
                Choose your path. <span className="text-red-600">Build income your way.</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-navy-600">
                Already source loan business? Become a Business Partner. Have a trusted network but
                no lending experience? Join as a Referral Partner.
              </p>
              <ul className="mt-6 grid gap-3 text-sm text-navy-700 sm:grid-cols-2">
                {[
                  "No investment for Referral Partners",
                  "Dedicated support for Business Partners",
                  "Transparent lead and referral tracking",
                  "Role-specific rewards and resources",
                ].map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
              <Button size="lg" asChild className="mt-8">
                <a href="#partner-paths">
                  Compare partner types
                  <ArrowDown className="h-4 w-4" aria-hidden />
                </a>
              </Button>
            </div>

            <figure className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-hairline bg-white p-2 shadow-[0_28px_70px_-45px_rgba(7,13,36,0.6)]">
              <Image
                src="/images/partner-referral-network.png"
                alt="TrueLend Referral Partner poster explaining referral rewards, no investment, flexible working and covered loan products"
                width={1024}
                height={1536}
                priority
                sizes="(min-width: 1024px) 390px, (min-width: 640px) 440px, calc(100vw - 40px)"
                className="h-auto w-full rounded-xl"
              />
              <figcaption className="px-3 py-2 text-center text-xs font-medium text-navy-500">
                TrueLend Referral Partner campaign
              </figcaption>
            </figure>
          </Container>
        </section>

        <section id="partner-paths" className="scroll-mt-16 bg-paper-deep/55">
          <Container className="py-16 sm:py-20">
            <SectionHeading
              eyebrow="Two ways to partner"
              title="Which TrueLend partner are you?"
              lede="Compare who each path is for, what you do, and what you receive before creating your account."
            />
            <PartnerPathCards className="mt-10" />
          </Container>
        </section>

        <section id="registration" className="scroll-mt-16">
          <Container className="py-16 sm:py-20">
            <Card className="mx-auto w-full max-w-2xl p-6 sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-600">
                Create your account
              </p>
              <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-navy-950">
                Become a TrueLend partner
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-navy-600">
                Select your partner type, complete your details, and upload verification documents
                after registration.
              </p>
              <div className="mt-7">
                <RegisterForm siteKey={env.TURNSTILE_SITE_KEY} />
              </div>
              <p className="mt-6 text-center text-sm text-navy-500">
                Already a partner?{" "}
                <Link href="/login" className="font-semibold text-red-600 hover:text-red-700">
                  Sign in
                </Link>
              </p>
            </Card>
          </Container>
        </section>
      </main>
    </>
  );
}
