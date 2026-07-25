import Link from "next/link";
import {
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  Gift,
  Grid2X2,
  Mail,
  MapPin,
  PhoneCall,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Button, Card, Container, Logo, SubmitButton } from "@truelend/ui";
import {
  contactPhone,
  formatDateTime,
  referralPartnerEmail,
  referralTypeLabel,
} from "@truelend/reference";
import { reopenApplication } from "@/lib/kyc-actions";
import { SignOutButton } from "@/components/sign-out-button";
import { PartnerIdChip } from "@/components/partner-id-chip";

const nextSteps = [
  {
    icon: ClipboardList,
    title: "Application Review",
    description: "Our team will review your details within 24 hours.",
    tone: "bg-red-50 text-red-600",
    badge: "bg-red-600",
  },
  {
    icon: PhoneCall,
    title: "Verification Call",
    description: "We may call you to verify your information.",
    tone: "bg-sun-100 text-sun-700",
    badge: "bg-sun-500",
  },
  {
    icon: ShieldCheck,
    title: "Welcome & Onboarding",
    description: "Once approved, you’ll receive access to your dashboard.",
    tone: "bg-emerald-50 text-emerald-700",
    badge: "bg-emerald-700",
  },
  {
    icon: Gift,
    title: "Start Referring & Earning",
    description: "Refer borrowers and earn eligible incentives.",
    tone: "bg-blue-50 text-blue-700",
    badge: "bg-blue-800",
  },
] as const;

export function UnderReviewScreen({
  name,
  email,
  referenceId,
  submittedAt,
  referralType,
  city,
}: {
  name: string;
  email: string;
  referenceId: string;
  submittedAt: Date;
  referralType: string | null;
  city: string | null;
}) {
  return (
    <div className="min-h-screen bg-red-50/20">
      <header className="border-b border-hairline bg-white/95 backdrop-blur">
        <Container className="flex h-[78px] max-w-[1240px] items-center justify-between gap-6">
          <span className="text-navy-800">
            <Logo />
          </span>
          <nav className="hidden items-center gap-8 text-sm font-medium text-navy-800 lg:flex">
            <Link href="/#how-it-works" className="hover:text-red-600">
              How It Works
            </Link>
            <Link href="/#why-truelend" className="hover:text-red-600">
              Why TrueLend
            </Link>
            <Link href="/#who-can-join" className="hover:text-red-600">
              Who Can Join
            </Link>
            <Link href="/#benefits" className="hover:text-red-600">
              Referral Benefits
            </Link>
            <Link href="/#faqs" className="hover:text-red-600">
              FAQs
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard">
                <Grid2X2 className="h-4 w-4" aria-hidden /> Dashboard
              </Link>
            </Button>
            <SignOutButton className="hidden xl:inline-flex" />
          </div>
        </Container>
      </header>

      <main id="main-content">
        <Container className="max-w-[1240px] py-8">
          <div className="grid items-center gap-5 lg:grid-cols-[280px_minmax(0,1fr)_280px]">
            <Card className="p-5">
              <h2 className="font-display text-lg font-bold text-navy-950">
                Your Application Details
              </h2>
              <dl className="mt-5 space-y-4">
                {[
                  { icon: UserRound, label: "Name", value: name },
                  {
                    icon: BriefcaseBusiness,
                    label: "Referral Type",
                    value: referralTypeLabel(referralType),
                  },
                  { icon: MapPin, label: "City", value: city || "—" },
                  {
                    icon: CalendarDays,
                    label: "Date of Application",
                    value: formatDateTime(submittedAt),
                  },
                ].map((item) => (
                  <div key={item.label} className="flex gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                      <item.icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div>
                      <dt className="text-xs text-navy-500">{item.label}</dt>
                      <dd className="text-sm font-semibold text-navy-950">{item.value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </Card>

            <div className="px-3 text-center">
              <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="h-11 w-11" aria-hidden />
              </span>
              <h1 className="mt-5 text-balance font-display text-4xl font-extrabold tracking-tight text-navy-950">
                Your Application is Submitted!
              </h1>
              <p className="mt-3 text-lg font-semibold text-navy-800">
                Thank you for joining the TrueLend Network.
              </p>
              <p className="mt-1 text-base text-navy-700">We’re excited to have you on board.</p>
              <div className="mx-auto mt-7 flex max-w-[380px] items-center gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/50 px-5 py-4 text-left">
                <Mail className="h-7 w-7 shrink-0 text-emerald-700" aria-hidden />
                <p className="text-sm leading-relaxed text-navy-700">
                  We’ve sent a confirmation email to{" "}
                  <strong className="text-emerald-700">{email}</strong> with your application
                  details.
                </p>
              </div>
            </div>

            <Card className="p-5">
              <h2 className="font-display text-lg font-bold text-navy-950">
                Your Referral Partner ID
              </h2>
              <PartnerIdChip
                referenceId={referenceId}
                className="mt-5 w-full justify-between border-red-200 bg-red-50 text-lg"
              />
              <p className="mt-4 text-sm leading-relaxed text-navy-600">
                Use this ID to track your application status or when you contact support.
              </p>
              <p className="mt-5 flex gap-2 rounded-xl bg-blue-50 px-4 py-3 text-xs text-navy-700">
                <Check className="h-4 w-4 shrink-0 text-blue-700" aria-hidden />
                Save this ID. You’ll need it for future reference.
              </p>
            </Card>
          </div>

          <Card className="mt-6 px-6 py-5">
            <h2 className="text-center font-display text-2xl font-extrabold text-navy-950">
              What Happens Next?
            </h2>
            <ol className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {nextSteps.map((step, index) => (
                <li key={step.title} className="relative">
                  {index < nextSteps.length - 1 && (
                    <span
                      aria-hidden
                      className="absolute left-16 right-0 top-6 hidden border-t border-dashed border-navy-200 xl:block"
                    />
                  )}
                  <span
                    className={`relative flex h-12 w-12 items-center justify-center rounded-full ${step.tone}`}
                  >
                    <step.icon className="h-6 w-6" aria-hidden />
                  </span>
                  <span
                    className={`absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[0.6rem] font-bold text-white ${step.badge}`}
                  >
                    {index + 1}
                  </span>
                  <h3 className="mt-3 font-display font-bold text-navy-950">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-navy-600">{step.description}</p>
                </li>
              ))}
            </ol>
          </Card>

          <div className="mt-4 flex flex-col justify-between gap-5 rounded-2xl border border-red-100 bg-red-50 px-6 py-4 sm:flex-row sm:items-center">
            <div>
              <p className="font-display font-bold text-navy-950">
                You’re now part of our early Referral Partner community.
              </p>
              <p className="mt-1 text-sm text-navy-600">
                Need help? Call{" "}
                <a href={contactPhone.href} className="font-semibold text-red-600">
                  {contactPhone.display}
                </a>{" "}
                or email{" "}
                <a href={`mailto:${referralPartnerEmail}`} className="font-semibold text-red-600">
                  {referralPartnerEmail}
                </a>
                .
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" asChild>
                <Link href="/resources">Open Referral Partner Guide</Link>
              </Button>
              <form action={reopenApplication}>
                <SubmitButton
                  pendingText="Reopening…"
                  confirm="Reopen your application for editing? You'll need to submit it again for review."
                >
                  Edit Application
                </SubmitButton>
              </form>
            </div>
          </div>
        </Container>
      </main>
    </div>
  );
}
