import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ChartNoAxesCombined,
  Gift,
  Headset,
  HeartHandshake,
  Rocket,
  ShieldCheck,
  UserRoundPlus,
} from "lucide-react";
import { Card, Container } from "@truelend/ui";
import { contactPhone } from "@truelend/reference";
import { PublicHeader } from "@/components/public-header";
import { RegisterForm, type RegistrationAccountSummary } from "@/components/register-form";
import { SignOutButton } from "@/components/sign-out-button";

const reasons = [
  {
    icon: UserRoundPlus,
    title: "Quick & simple registration",
    description: "Create your account in a few easy steps.",
  },
  {
    icon: Gift,
    title: "Start referring immediately",
    description: "No waiting, sales targets or joining fee.",
  },
  {
    icon: ShieldCheck,
    title: "Secure by design",
    description: "Your account and submitted information are protected.",
  },
  {
    icon: Headset,
    title: "We’re here to help",
    description: "Our referral-support team is always with you.",
  },
] as const;

const communityBenefits = [
  {
    icon: UserRoundPlus,
    title: "Growing Community",
    description: "Join our early Referral Partner community.",
  },
  {
    icon: Rocket,
    title: "Be a Pioneer",
    description: "Build a trusted network from the start.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Unlimited Potential",
    description: "More referrals, more impact and rewards.",
  },
  {
    icon: HeartHandshake,
    title: "Make a Difference",
    description: "Help people get the right loan.",
  },
] as const;

export function DedicatedRegister({
  siteKey,
  account,
}: {
  siteKey?: string;
  account?: RegistrationAccountSummary;
}) {
  return (
    <>
      <PublicHeader />

      <main id="main-content" tabIndex={-1} className="bg-red-50/20">
        <Container className="grid max-w-[1240px] gap-7 py-6 lg:grid-cols-[590px_minmax(0,1fr)]">
          <section className="relative">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden /> Back to home
            </Link>
            <h1 className="mt-5 max-w-xl text-balance font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-navy-950">
              {account ? (
                <>
                  Complete your <span className="text-red-600">TrueLend</span>
                  <br />
                  Referral Profile
                </>
              ) : (
                <>
                  Join the <span className="text-red-600">TrueLend</span>
                  <br />
                  Referral Network
                </>
              )}
            </h1>
            <p className="mt-3 max-w-sm text-base leading-relaxed text-navy-600 lg:max-w-[275px]">
              {account
                ? "Your account is secure. Complete the remaining details to reach your dashboard."
                : "Fill in your details to get started. It takes less than two minutes."}
            </p>

            <div className="relative mt-6 lg:mt-4 lg:min-h-[390px]">
              <div className="relative z-10 space-y-4 lg:w-[275px] lg:pt-3">
                {reasons.map((reason) => (
                  <div key={reason.title} className="flex gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                      <reason.icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <h2 className="font-display text-sm font-bold text-navy-950">
                        {reason.title}
                      </h2>
                      <p className="mt-1 text-xs leading-relaxed text-navy-600">
                        {reason.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="relative mx-auto mt-5 h-[360px] w-full max-w-[300px] overflow-hidden lg:absolute lg:-top-28 lg:right-0 lg:mt-0 lg:h-[400px] lg:w-[300px]">
                <div
                  aria-hidden
                  className="absolute inset-x-5 bottom-4 top-16 rounded-[50%_50%_20%_20%] bg-red-50"
                />
                <Image
                  src="/images/referral-registration-v2.png"
                  alt="A TrueLend Referral Partner registering with his phone"
                  fill
                  priority
                  sizes="300px"
                  className="origin-bottom scale-110 object-contain object-bottom"
                />
              </div>
              <Card className="relative z-10 mx-auto -mt-24 w-[calc(100%-1.5rem)] max-w-[280px] border-0 bg-white/95 p-4 shadow-[0_20px_45px_-26px_rgba(7,13,36,0.85)] backdrop-blur lg:absolute lg:right-3 lg:top-[166px] lg:mt-0 lg:w-[220px]">
                <p className="font-display text-sm font-bold text-navy-950">
                  “I refer. TrueLend handles the rest.”
                </p>
                <p className="mt-2 text-xs font-semibold text-navy-700">— Anil Kumar</p>
                <p className="text-xs text-navy-500">Referral Partner</p>
                <p className="mt-1 text-sm tracking-[0.12em] text-sun-500" aria-label="5 stars">
                  ★★★★★
                </p>
              </Card>
              <div className="relative z-10 mt-4 w-full rounded-2xl bg-blue-50 px-4 py-3 text-sm text-navy-700 lg:absolute lg:bottom-0 lg:left-0 lg:mt-0 lg:w-[280px] lg:text-xs">
                <p className="font-bold text-navy-950">Need help?</p>
                <p className="mt-1">
                  Call or WhatsApp us at{" "}
                  <a className="font-bold text-red-600" href={contactPhone.href}>
                    {contactPhone.compact}
                  </a>
                </p>
                <p className="mt-1 text-navy-600">Mon – Sat (10 AM – 6 PM)</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 rounded-2xl bg-blue-50/70 p-3 min-[380px]:grid-cols-2 sm:grid-cols-4">
              {communityBenefits.map((benefit) => (
                <div key={benefit.title} className="flex gap-2">
                  <benefit.icon className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
                  <div>
                    <p className="text-xs font-bold text-navy-950">{benefit.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-navy-600">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <Card className="h-fit w-full p-6 shadow-[0_28px_70px_-42px_rgba(7,13,36,0.55)] lg:sticky lg:top-24">
            <RegisterForm siteKey={siteKey} account={account} />

            {account ? (
              <div className="mt-5 text-center">
                <p className="mb-2 break-words text-sm text-navy-500">Not {account.email}?</p>
                <SignOutButton className="justify-center" />
              </div>
            ) : (
              <p className="mt-5 text-center text-sm text-navy-500">
                Already a Referral Partner?{" "}
                <Link href="/login" className="font-semibold text-red-600 hover:text-red-700">
                  Sign in
                </Link>
              </p>
            )}
            <p className="mt-3 flex items-center justify-center gap-2 text-xs text-navy-500">
              <Rocket className="h-4 w-4 text-red-600" aria-hidden />
              Free to join · No registration fee
            </p>
          </Card>
        </Container>
      </main>
    </>
  );
}
