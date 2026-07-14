import Image from "next/image";
import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { Card, Container, HexPattern } from "@truelend/ui";
import { PublicHeader } from "@/components/public-header";
import { RegisterForm } from "@/components/register-form";

// One dedicated signup screen per partner type — no path comparison, no type
// toggle. Kept as a single component so both pages stay visually in sync.
const copy = {
  business: {
    eyebrow: "TrueLend Business Partner™",
    title: "Become a Business Partner",
    lede: "Already source loan business? Register to bring complete loan cases, track every stage, and earn business commissions.",
    bullets: [
      "Business commissions on successful cases",
      "Dedicated relationship manager",
      "Lead and case tracking dashboard",
      "Marketing resources and training",
    ],
    image: "/images/business-partner.png",
    imageAlt: "Indian business partner and loan professional in a navy suit",
    imageWidth: 1024,
    imageHeight: 683,
    cardTitle: "Create your Business Partner account",
    switchLabel: "Prefer to simply refer people?",
    switchHref: "/register/referral",
    switchCta: "Become a Referral Partner",
  },
  referral: {
    eyebrow: "TrueLend Referral Partner™",
    title: "Become a Referral Partner",
    lede: "Have a trusted network but no lending experience? Introduce people who need a loan and earn referral rewards.",
    bullets: [
      "Referral rewards for successful introductions",
      "No investment and no sales targets",
      "No documentation expertise required",
      "End-to-end support from TrueLend",
    ],
    image: "/images/partner-referral-network.png",
    imageAlt:
      "TrueLend Referral Partner poster explaining referral rewards, no investment and flexible working",
    imageWidth: 1024,
    imageHeight: 1536,
    cardTitle: "Create your Referral Partner account",
    switchLabel: "Already source loan business?",
    switchHref: "/register/business",
    switchCta: "Become a Business Partner",
  },
} as const;

export function DedicatedRegister({
  type,
  siteKey,
}: {
  type: "business" | "referral";
  siteKey?: string;
}) {
  const c = copy[type];

  return (
    <>
      <PublicHeader />

      <main>
        <section className="relative overflow-hidden border-b border-hairline">
          <HexPattern className="-left-44 -top-32 h-[520px] w-[520px] text-navy-800/[0.04]" />
          <Container className="grid items-start gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.82fr)] lg:py-20">
            <div>
              <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-red-600">
                <span aria-hidden className="h-px w-8 bg-red-600" />
                {c.eyebrow}
              </p>
              <h1 className="mt-5 text-balance font-display text-4xl font-extrabold leading-tight tracking-tight text-navy-950 sm:text-5xl">
                {c.title}
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-navy-600">{c.lede}</p>
              <ul className="mt-6 grid gap-3 text-sm text-navy-700 sm:grid-cols-2">
                {c.bullets.map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
              <figure className="mt-8 overflow-hidden rounded-2xl border border-hairline bg-white p-2 shadow-[0_28px_70px_-45px_rgba(7,13,36,0.6)]">
                <Image
                  src={c.image}
                  alt={c.imageAlt}
                  width={c.imageWidth}
                  height={c.imageHeight}
                  priority
                  sizes="(min-width: 1024px) 620px, calc(100vw - 40px)"
                  className="h-auto w-full rounded-xl"
                />
              </figure>
            </div>

            <Card className="w-full p-6 sm:p-8 lg:sticky lg:top-20">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-600">
                Create your account
              </p>
              <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-navy-950">
                {c.cardTitle}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-navy-600">
                Complete your details, then upload verification documents after registration.
              </p>
              <div className="mt-7">
                <RegisterForm type={type} siteKey={siteKey} />
              </div>
              <p className="mt-6 text-center text-sm text-navy-500">
                Already a partner?{" "}
                <Link href="/login" className="font-semibold text-red-600 hover:text-red-700">
                  Sign in
                </Link>
              </p>
              <p className="mt-3 text-center text-sm text-navy-500">
                {c.switchLabel}{" "}
                <Link href={c.switchHref} className="font-semibold text-red-600 hover:text-red-700">
                  {c.switchCta}
                </Link>
              </p>
            </Card>
          </Container>
        </section>
      </main>
    </>
  );
}
