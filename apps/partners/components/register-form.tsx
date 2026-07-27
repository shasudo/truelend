"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Info, LockKeyhole, ShieldCheck } from "lucide-react";
import { Turnstile } from "@marsidev/react-turnstile";
import { Button, Field, Input, Select, useFormDraft } from "@truelend/ui";
import { appUrls, referralPartnerEmail, referralTypeOptions } from "@truelend/reference";
import { registerPartner, type RegisterState } from "@/lib/signup-actions";
import {
  registrationErrorNeedsNewVerification,
  registrationErrorOffersAccountHelp,
  type RegistrationStep,
} from "@/lib/registration-flow";

const steps = [
  { label: "Basic Details", shortLabel: "Basic" },
  { label: "Contact Details", shortLabel: "Contact" },
  { label: "Verification", shortLabel: "Verify" },
  { label: "Complete", shortLabel: "Done" },
] as const;

const cities = [
  "Hyderabad",
  "Bengaluru",
  "Chennai",
  "Delhi",
  "Mumbai",
  "Pune",
  "Kolkata",
  "Ahmedabad",
  "Jaipur",
  "Other",
] as const;

const experienceOptions = [
  "Less than 1 year",
  "1–3 years",
  "3–5 years",
  "5–10 years",
  "More than 10 years",
] as const;

const registrationDraftFields = [
  "name",
  "dateOfBirth",
  "referralType",
  "city",
  "pan",
  "experienceNote",
  "phone",
  "email",
] as const;

export interface RegistrationAccountSummary {
  id: string;
  email: string;
  name: string;
}

export function RegisterForm({
  siteKey,
  account,
}: {
  siteKey?: string;
  account?: RegistrationAccountSummary;
}) {
  const errorRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<RegistrationStep>(1);
  const [turnstileToken, setTurnstileToken] = useState<string>();
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [turnstileError, setTurnstileError] = useState<string>();
  const [state, action, pending] = useActionState<RegisterState, FormData>(registerPartner, {});
  const draft = useFormDraft({
    storageKey: `truelend:partner:registration:${account?.id ?? "new"}`,
    fields: registrationDraftFields,
    error: state.error,
    resultKey: state,
  });

  useEffect(() => {
    if (!state.error) return;
    setStep(state.step ?? 3);
    if (registrationErrorNeedsNewVerification(state.code)) {
      setTurnstileToken(undefined);
      setTurnstileKey((key) => key + 1);
    }
    for (const [name, value] of Object.entries(state.values ?? {})) {
      const control = draft.formRef.current?.elements.namedItem(name);
      if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement) {
        control.value = value;
      }
    }
    const frame = window.requestAnimationFrame(() => errorRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [draft.formRef, state.code, state.error, state.step, state.values]);

  function advance(from: RegistrationStep, to: RegistrationStep) {
    const section = draft.formRef.current?.querySelector<HTMLElement>(`[data-step="${from}"]`);
    if (!section) return;
    const controls = section.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
      "input, select",
    );
    if (Array.from(controls).every((control) => control.reportValidity())) setStep(to);
  }

  return (
    <form
      ref={draft.formRef}
      action={action}
      onInput={draft.onInput}
      onChange={draft.onChange}
      onSubmit={draft.onSubmit}
      aria-busy={pending}
    >
      <ol className="grid grid-cols-4" aria-label="Registration progress">
        {steps.map(({ label, shortLabel }, index) => {
          const number = index + 1;
          const active = number === step;
          const complete = number < step;
          return (
            <li key={label} className="relative text-center">
              {index > 0 && (
                <span
                  aria-hidden
                  className={`absolute right-1/2 top-4 h-px w-full ${
                    number <= step ? "bg-red-600" : "bg-navy-200"
                  }`}
                />
              )}
              <span
                className={`relative mx-auto flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold ${
                  active || complete
                    ? "border-red-600 bg-red-600 text-white"
                    : "border-navy-200 bg-white text-navy-700"
                }`}
              >
                {number}
              </span>
              <span
                className={`mt-2 block text-xs font-semibold ${
                  active ? "text-red-600" : "text-navy-600"
                }`}
              >
                <span className="sm:hidden">{shortLabel}</span>
                <span className="hidden sm:inline">{label}</span>
              </span>
            </li>
          );
        })}
      </ol>

      {account && (
        <div className="mt-6 rounded-xl border border-navy-200 bg-navy-50 px-4 py-3 text-sm text-navy-700">
          <p className="font-semibold text-navy-950">Continue your signed-in registration</p>
          <p className="mt-1 break-words">
            Finish the Referral Partner profile for <strong>{account.email}</strong>.
          </p>
        </div>
      )}

      {state.error && (
        <div
          ref={errorRef}
          role="alert"
          tabIndex={-1}
          className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 outline-none focus-visible:ring-2 focus-visible:ring-red-600"
        >
          <p className="font-semibold">{state.error}</p>
          {registrationErrorOffersAccountHelp(state.code) && (
            <p className="mt-2 leading-relaxed">
              If you may already have an account,{" "}
              <Link href="/login" className="font-bold underline underline-offset-2">
                sign in
              </Link>{" "}
              or{" "}
              <Link href="/forgot-password" className="font-bold underline underline-offset-2">
                reset your password
              </Link>
              . Otherwise, check your details and try again.
            </p>
          )}
          {state.code === "account_conflict" && (
            <p className="mt-2 leading-relaxed">
              Sign out and use a different account, or contact{" "}
              <a
                href={`mailto:${referralPartnerEmail}`}
                className="font-bold underline underline-offset-2"
              >
                Referral Partner support
              </a>
              .
            </p>
          )}
          {!account && (
            <p className="mt-2 text-xs leading-relaxed">
              For security, re-enter your password before submitting again.
            </p>
          )}
        </div>
      )}

      <section data-step="1" className={step === 1 ? "mt-8" : "hidden"}>
        <h2 className="font-display text-xl font-extrabold tracking-tight text-navy-950">
          Basic Details
        </h2>
        <p className="mt-1 text-sm text-navy-600">Please tell us a little about yourself.</p>

        <div className="mt-6 grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <Field label="Full Name" htmlFor="name" required>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              maxLength={120}
              defaultValue={account?.name}
              placeholder="Enter your full name"
              required
            />
          </Field>
          <Field label="Date of Birth" htmlFor="dateOfBirth" required>
            <Input id="dateOfBirth" name="dateOfBirth" type="date" required />
          </Field>
          <Field label="Referral Type" htmlFor="referralType" required>
            <Select id="referralType" name="referralType" defaultValue="" required>
              <option value="" disabled>
                Select your role
              </option>
              {referralTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="City" htmlFor="city" required>
            <Select id="city" name="city" defaultValue="" required>
              <option value="" disabled>
                Select your city
              </option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="PAN Number (Optional)" htmlFor="pan">
            <Input
              id="pan"
              name="pan"
              autoCapitalize="characters"
              maxLength={10}
              placeholder="Enter your PAN number"
            />
          </Field>
          <Field label="Years of Experience (Optional)" htmlFor="experienceNote">
            <Select id="experienceNote" name="experienceNote" defaultValue="">
              <option value="">Select experience</option>
              {experienceOptions.map((experience) => (
                <option key={experience} value={experience}>
                  {experience}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="mt-5 rounded-xl bg-navy-50 px-4 py-3">
          <p className="flex gap-3 text-xs leading-relaxed text-navy-700">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-navy-700" aria-hidden />
            <span>
              <strong className="block text-navy-950">Why PAN is optional</strong>
              PAN helps us process incentives faster. You can add it later during verification.
            </span>
          </p>
        </div>

        <Button
          type="button"
          size="lg"
          className="mx-auto mt-6 flex w-full max-w-[260px]"
          onClick={() => advance(1, 2)}
        >
          Continue <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      </section>

      <section data-step="2" className={step === 2 ? "mt-8" : "hidden"}>
        <h2 className="font-display text-xl font-extrabold tracking-tight text-navy-950">
          Contact Details
        </h2>
        <p className="mt-1 text-sm text-navy-600">
          {account
            ? "Add the mobile number we should use for your Referral Partner profile."
            : "Add the secure account details you’ll use to access your dashboard."}
        </p>

        <div className="mt-6 grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <Field label="Mobile Number" htmlFor="phone" required>
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="10-digit mobile"
              required
            />
          </Field>
          {account ? (
            <Field label="Signed-in email" htmlFor="signedInEmail">
              <Input id="signedInEmail" value={account.email} readOnly disabled />
            </Field>
          ) : (
            <>
              <Field label="Email" htmlFor="email" required>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  placeholder="Enter your email"
                  required
                />
              </Field>
              <Field label="Password" htmlFor="password" required>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  placeholder="Minimum 8 characters"
                  required
                />
              </Field>
            </>
          )}
        </div>

        <div className="mt-8 flex items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={() => setStep(1)}>
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back
          </Button>
          <Button type="button" onClick={() => advance(2, 3)}>
            Continue <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </section>

      <section data-step="3" className={step === 3 ? "mt-8" : "hidden"}>
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-navy-50 text-navy-700">
          <ShieldCheck className="h-7 w-7" aria-hidden />
        </span>
        <h2 className="mt-4 text-center font-display text-xl font-extrabold tracking-tight text-navy-950">
          Verify & Submit
        </h2>
        <p className="mx-auto mt-2 max-w-md text-center text-sm leading-relaxed text-navy-600">
          Complete the human-verification check, then submit your Referral Partner registration.
        </p>

        <input type="hidden" name="turnstileToken" value={turnstileToken ?? ""} />
        <div className="relative mt-6 h-[65px] w-full">
          <div className="absolute left-1/2 top-0 w-[min(300px,calc(100vw-1.25rem))] -translate-x-1/2 min-[380px]:static min-[380px]:w-full min-[380px]:translate-x-0">
            {siteKey ? (
              <Turnstile
                key={turnstileKey}
                siteKey={siteKey}
                onSuccess={(token) => {
                  setTurnstileError(undefined);
                  setTurnstileToken(token);
                }}
                onExpire={() => setTurnstileToken(undefined)}
                onTimeout={() => setTurnstileToken(undefined)}
                onError={() => {
                  setTurnstileToken(undefined);
                  setTurnstileError("Human verification could not load. Refresh and try again.");
                }}
                options={{ theme: "light", action: "partner_registration", size: "flexible" }}
              />
            ) : (
              <p className="rounded-lg bg-paper-deep px-4 py-3 text-xs text-navy-600">
                Human verification is disabled in this local environment.
              </p>
            )}
          </div>
        </div>

        {turnstileError && (
          <p role="alert" className="mt-3 text-center text-sm text-red-700">
            {turnstileError}
          </p>
        )}
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => setStep(2)}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back
          </Button>
          <Button
            type="submit"
            disabled={pending || Boolean(siteKey && !turnstileToken)}
            className="w-full sm:min-w-[220px] sm:w-auto"
          >
            {pending ? "Creating your account…" : "Submit Application"}
            {!pending && <ArrowRight className="h-4 w-4" aria-hidden />}
          </Button>
        </div>
        <p className="mt-4 text-center text-xs leading-relaxed text-navy-500">
          By submitting, you agree to the{" "}
          <a
            href={`${appUrls.website}/terms`}
            className="font-semibold text-red-600 underline underline-offset-2 hover:text-red-700"
          >
            Terms of Use
          </a>{" "}
          and the{" "}
          <a
            href={`${appUrls.website}/privacy`}
            className="font-semibold text-red-600 underline underline-offset-2 hover:text-red-700"
          >
            Privacy Policy
          </a>
          .
        </p>
      </section>

      <div className="mt-6 rounded-xl bg-navy-50 px-4 py-3">
        <p className="flex gap-2 text-xs leading-relaxed text-navy-700">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-navy-700" aria-hidden />
          Your information is used only for account verification, referral servicing and incentive
          payments.
        </p>
      </div>
    </form>
  );
}
