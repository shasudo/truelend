"use client";

import type { ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Checkbox, Field, Input, Select, Textarea } from "@truelend/ui";
import {
  products,
  employmentTypes,
  loanTenures,
  loanPurposes,
  experienceBands,
  employerTenureLabels,
  cardProducts,
  type ProductSlug,
} from "@truelend/reference";
import { enquiryFormSchema } from "@/lib/lead-schemas";
import {
  FormSuccess,
  NoScriptFallback,
  RootError,
  TurnstileField,
  TurnstilePendingHint,
  useLeadForm,
} from "./lead-form";

const MESSAGE_LIMIT = 500;

function Section({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-5">
      <legend className="mb-1 flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 font-display text-sm font-extrabold tabular-nums text-red-600">
          {n}
        </span>
        <span className="font-display text-lg font-bold text-navy-950">{title}</span>
      </legend>
      {children}
    </fieldset>
  );
}

export function EnquiryForm({ defaultProduct = "" }: { defaultProduct?: ProductSlug | "" }) {
  const {
    form,
    onSubmit,
    succeeded,
    rootError,
    turnstileKey,
    turnstileReady,
    turnstileError,
    setToken,
    resetToken,
    failTurnstile,
  } = useLeadForm(zodResolver(enquiryFormSchema), {
    kind: "enquiry",
    productSlug: defaultProduct,
    loanAmount: "",
    loanPurpose: "",
    tenureMonths: "",
    preferredEmi: "",
    name: "",
    phone: "",
    email: "",
    city: "",
    pincode: "",
    employmentType: "",
    employerName: "",
    monthlyIncome: "",
    experienceYears: "",
    existingWithEmployer: "",
    existingEmi: "",
    outstandingLoanAmount: "",
    creditCardOutstanding: "",
    message: "",
    consent: false,
  });
  const { register, formState, watch } = form;
  const err = formState.errors;
  const product = watch("productSlug");
  const isCard = cardProducts.has(product);
  const messageLength = watch("message")?.length ?? 0;

  if (succeeded) {
    return (
      <FormSuccess
        title="Assessment received."
        sub="A Borrowing Advisor will review your details and call you within one working day — from our number, once, and only about this request."
      />
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-9">
      <NoScriptFallback />

      <Section n="01" title="Your Loan Requirement">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label={isCard ? "Credit card" : "Loan product"}
            htmlFor="enq-product"
            required
            error={err.productSlug?.message}
          >
            <Select id="enq-product" aria-invalid={!!err.productSlug} {...register("productSlug")}>
              <option value="">{isCard ? "Select a card" : "Select loan type"}</option>
              {products.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          {!isCard && (
            <Field
              label="Loan amount (₹)"
              htmlFor="enq-amount"
              required
              error={err.loanAmount?.message}
            >
              <Input
                id="enq-amount"
                inputMode="numeric"
                placeholder="e.g. 2500000"
                aria-invalid={!!err.loanAmount}
                {...register("loanAmount")}
              />
            </Field>
          )}
          <Field
            label="Purpose of loan"
            htmlFor="enq-purpose"
            required
            error={err.loanPurpose?.message}
          >
            <Select id="enq-purpose" aria-invalid={!!err.loanPurpose} {...register("loanPurpose")}>
              <option value="">Select purpose</option>
              {loanPurposes.map((purpose) => (
                <option key={purpose} value={purpose}>
                  {purpose}
                </option>
              ))}
            </Select>
          </Field>
          {!isCard && (
            <Field label="Preferred tenure" htmlFor="enq-tenure" error={err.tenureMonths?.message}>
              <Select id="enq-tenure" {...register("tenureMonths")}>
                <option value="">Select tenure</option>
                {loanTenures.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {!isCard && (
            <Field
              label="Preferred EMI (optional)"
              htmlFor="enq-preferred-emi"
              error={err.preferredEmi?.message}
            >
              <Input
                id="enq-preferred-emi"
                inputMode="numeric"
                placeholder="e.g. 25000"
                {...register("preferredEmi")}
              />
            </Field>
          )}
        </div>
      </Section>

      <Section n="02" title="About You">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Full name" htmlFor="enq-name" required error={err.name?.message}>
            <Input
              id="enq-name"
              autoComplete="name"
              placeholder="Enter your full name"
              aria-invalid={!!err.name}
              {...register("name")}
            />
          </Field>
          <Field label="Mobile number" htmlFor="enq-phone" required error={err.phone?.message}>
            <Input
              id="enq-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="Enter 10 digit mobile number"
              aria-invalid={!!err.phone}
              {...register("phone")}
            />
          </Field>
          <Field label="Email" htmlFor="enq-email" required error={err.email?.message}>
            <Input
              id="enq-email"
              type="email"
              autoComplete="email"
              placeholder="Enter your email"
              aria-invalid={!!err.email}
              {...register("email")}
            />
          </Field>
          <Field label="City" htmlFor="enq-city" required error={err.city?.message}>
            <Input
              id="enq-city"
              autoComplete="address-level2"
              placeholder="Enter your city"
              aria-invalid={!!err.city}
              {...register("city")}
            />
          </Field>
          <Field label="PIN code" htmlFor="enq-pin" required error={err.pincode?.message}>
            <Input
              id="enq-pin"
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="Enter PIN code"
              aria-invalid={!!err.pincode}
              {...register("pincode")}
            />
          </Field>
        </div>
      </Section>

      <Section n="03" title="Employment & Income">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Employment type"
            htmlFor="enq-employment"
            required
            error={err.employmentType?.message}
          >
            <Select
              id="enq-employment"
              aria-invalid={!!err.employmentType}
              {...register("employmentType")}
            >
              <option value="">Select employment type</option>
              {employmentTypes.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Employer / business name"
            htmlFor="enq-employer"
            required
            error={err.employerName?.message}
          >
            <Input
              id="enq-employer"
              placeholder="Enter employer / business name"
              aria-invalid={!!err.employerName}
              {...register("employerName")}
            />
          </Field>
          <Field
            label="Monthly income (₹)"
            htmlFor="enq-income"
            required
            error={err.monthlyIncome?.message}
          >
            <Input
              id="enq-income"
              inputMode="numeric"
              placeholder="e.g. 80000"
              aria-invalid={!!err.monthlyIncome}
              {...register("monthlyIncome")}
            />
          </Field>
          <Field
            label="Years of experience"
            htmlFor="enq-exp"
            required
            error={err.experienceYears?.message}
          >
            <Select
              id="enq-exp"
              aria-invalid={!!err.experienceYears}
              {...register("experienceYears")}
            >
              <option value="">Select experience</option>
              {experienceBands.map((band) => (
                <option key={band.value} value={band.value}>
                  {band.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Existing with employer"
            htmlFor="enq-employer-tenure"
            error={err.existingWithEmployer?.message}
          >
            <Select id="enq-employer-tenure" {...register("existingWithEmployer")}>
              <option value="">Select duration</option>
              {employerTenureLabels.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Section>

      <Section n="04" title="Existing Borrowings">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Current monthly EMI (₹)" htmlFor="enq-emi" error={err.existingEmi?.message}>
            <Input
              id="enq-emi"
              inputMode="numeric"
              placeholder="e.g. 25000"
              {...register("existingEmi")}
            />
          </Field>
          <Field
            label="Outstanding loan amount (₹)"
            htmlFor="enq-outstanding"
            error={err.outstandingLoanAmount?.message}
          >
            <Input
              id="enq-outstanding"
              inputMode="numeric"
              placeholder="e.g. 1000000"
              {...register("outstandingLoanAmount")}
            />
          </Field>
          <Field
            label="Credit card outstanding (₹)"
            htmlFor="enq-cc"
            error={err.creditCardOutstanding?.message}
          >
            <Input
              id="enq-cc"
              inputMode="numeric"
              placeholder="e.g. 50000"
              {...register("creditCardOutstanding")}
            />
          </Field>
        </div>
      </Section>

      <Section n="05" title="Additional Information">
        <Field
          label="Anything else you’d like your Borrowing Advisor to know?"
          htmlFor="enq-message"
          error={err.message?.message}
        >
          <Textarea
            id="enq-message"
            maxLength={MESSAGE_LIMIT}
            placeholder="e.g. existing offers, preferred bank, urgent requirement, special circumstances etc."
            {...register("message")}
          />
          <p className="mt-1 text-right text-xs tabular-nums text-muted">
            {messageLength}/{MESSAGE_LIMIT}
          </p>
        </Field>

        <label className="flex gap-3 text-sm leading-relaxed text-navy-600">
          <Checkbox
            aria-invalid={!!err.consent}
            aria-describedby={err.consent ? "enq-consent-error" : undefined}
            {...register("consent")}
          />
          <span>
            I authorise TrueLend to contact me about my enquiry on phone, WhatsApp or email. This
            consent overrides any DND registration.
          </span>
        </label>
        {err.consent && (
          <p id="enq-consent-error" role="alert" className="text-sm text-red-600">
            {err.consent.message}
          </p>
        )}

        <TurnstileField
          resetKey={turnstileKey}
          action="lead_enquiry"
          onToken={setToken}
          onExpire={resetToken}
          onError={failTurnstile}
        />
        <RootError message={rootError ?? turnstileError} />

        <div className="space-y-2">
          <Button
            type="submit"
            size="lg"
            disabled={formState.isSubmitting || !turnstileReady}
            className="w-full"
          >
            {formState.isSubmitting ? "Submitting…" : "Start My Borrowing Assessment"}
          </Button>
          <TurnstilePendingHint show={!turnstileReady && !turnstileError} />
        </div>
      </Section>
    </form>
  );
}
