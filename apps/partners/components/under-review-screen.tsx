import { CheckCircle2, Clock, BadgeCheck, Mail } from "lucide-react";
import { Card, Container, HexPattern, Logo, SubmitButton } from "@truelend/ui";
import { reopenApplication } from "@/lib/kyc-actions";
import { SignOutButton } from "@/components/sign-out-button";

const steps = [
  { icon: CheckCircle2, title: "Application submitted", state: "done" as const },
  { icon: Clock, title: "Under review by our team", state: "current" as const },
  { icon: BadgeCheck, title: "Verified — start earning", state: "todo" as const },
];

export function UnderReviewScreen({ name, email }: { name: string; email: string }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <HexPattern className="-right-40 -top-40 h-[520px] w-[520px] text-navy-800/[0.05]" />
      <header className="border-b border-hairline bg-white/80 backdrop-blur">
        <Container className="flex h-16 items-center justify-between">
          <span className="text-navy-800">
            <Logo />
          </span>
          <SignOutButton />
        </Container>
      </header>

      <Container className="flex flex-col items-center py-16 text-center sm:py-24">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-navy-800 text-white">
          <CheckCircle2 className="h-9 w-9" aria-hidden />
        </span>
        <h1 className="mt-6 text-balance font-display text-3xl font-extrabold tracking-tight text-navy-950 sm:text-4xl">
          Thanks, {name.split(" ")[0]} — your application is in.
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-navy-600">
          Our team is reviewing your details and documents. This usually takes about one working
          day. <strong className="text-navy-900">You can safely close this tab.</strong>
        </p>
        <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-hairline bg-white px-4 py-2 text-sm text-navy-700">
          <Mail className="h-4 w-4 text-red-600" aria-hidden />
          We&rsquo;ll email <strong className="font-semibold">{email}</strong> the moment
          you&rsquo;re verified.
        </p>

        <Card className="mt-10 w-full max-w-md p-6 text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            What happens next
          </p>
          <ol className="mt-4 space-y-4">
            {steps.map((step) => (
              <li key={step.title} className="flex items-center gap-3">
                <span
                  className={
                    step.state === "done"
                      ? "flex h-8 w-8 items-center justify-center rounded-full bg-navy-800 text-white"
                      : step.state === "current"
                        ? "flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-600 ring-2 ring-red-600"
                        : "flex h-8 w-8 items-center justify-center rounded-full bg-navy-800/[0.06] text-muted"
                  }
                >
                  <step.icon className="h-4.5 w-4.5" aria-hidden />
                </span>
                <span
                  className={
                    step.state === "todo"
                      ? "text-sm text-muted"
                      : "text-sm font-medium text-navy-900"
                  }
                >
                  {step.title}
                  {step.state === "current" && (
                    <span className="ml-2 text-xs font-normal text-red-600">In progress</span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </Card>

        <form action={reopenApplication} className="mt-8">
          <SubmitButton
            variant="ghost"
            size="sm"
            pendingText="Reopening…"
            confirm="Reopen your application for editing? You'll need to submit it again for review."
          >
            Need to change something? Edit your application
          </SubmitButton>
        </form>
      </Container>
    </div>
  );
}
