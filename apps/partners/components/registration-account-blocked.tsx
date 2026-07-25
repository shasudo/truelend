import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { Button, Card, Container } from "@truelend/ui";
import { referralPartnerEmail } from "@truelend/reference";
import { PublicHeader } from "@/components/public-header";
import { SignOutButton } from "@/components/sign-out-button";

export function RegistrationAccountBlocked({ email }: { email: string }) {
  return (
    <>
      <PublicHeader />
      <main id="main-content" tabIndex={-1} className="min-h-[calc(100vh-78px)] bg-red-50/20">
        <Container className="max-w-2xl py-10 sm:py-16">
          <Card className="p-6 sm:p-8">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700">
              <AlertTriangle className="h-6 w-6" aria-hidden />
            </span>
            <h1 className="mt-5 font-display text-2xl font-extrabold tracking-tight text-navy-950">
              Use a different account
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-navy-600">
              You are signed in as <strong className="break-words text-navy-950">{email}</strong>,
              but this account cannot be used to create a Referral Partner profile.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-navy-600">
              Sign out and register with another email. If you believe this is a mistake, contact
              Referral Partner support.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <SignOutButton className="h-10 rounded-lg border border-navy-200 px-4 font-semibold" />
              <Button asChild>
                <a href={`mailto:${referralPartnerEmail}`}>Contact support</a>
              </Button>
            </div>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-navy-600 hover:text-navy-950"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden /> Back to home
            </Link>
          </Card>
        </Container>
      </main>
    </>
  );
}
