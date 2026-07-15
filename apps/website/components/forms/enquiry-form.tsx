"use client";

import type { ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Checkbox, Field, Input, Select, Textarea } from "@truelend/ui";
import {
  products,
  employmentTypes,
  residenceTypes,
  loanTenures,
  securedProducts,
  businessProducts,
  cardProducts,
} from "@truelend/reference";
import { enquiryFormSchema } from "@/lib/schemas";
import {
  FormSuccess,
  NoScriptFallback,
  RootError,
  TurnstileField,
  TurnstilePendingHint,
  useLeadForm,
} from "./lead-form";

function Legend({ children }: { children: ReactNode }) {
  return (
    <legend className="font-display text-sm font-bold uppercase tracking-[0.14em] text-navy-500">
      {children}
    </legend>
  );
}

export function EnquiryForm({ defaultProduct = "" }: { defaultProduct?: string }) {
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
    name: "",
    phone: "",
    email: "",
    city: "",
    productSlug: defaultProduct,
    loanAmount: "",
    tenureMonths: "",
    loanPurpose: "",
    pincode: "",
    residenceType: "",
    employmentType: "",
    monthlyIncome: "",
    employerName: "",
    experienceYears: "",
    existingEmi: "",
    assetValue: "",
    annualTurnover: "",
    message: "",
    consent: false,
  });
  const { register, formState, watch } = form;
  const err = formState.errors;
  const product = watch("productSlug");
  const isCard = cardProducts.has(product);
  const showAsset = securedProducts.has(product);
  const showTurnover = businessProducts.has(product);

  if (succeeded) {
    return (
      <FormSuccess
        title="Application received."
        sub="An advisor will review your details and call you within one working day — from our number, once, and only about this application."
      />
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      <NoScriptFallback />

      <fieldset className="space-y-5">
        <Legend>{isCard ? "Card you want" : "Loan requirement"}</Legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label={isCard ? "Credit card" : "Loan you need"}
            htmlFor="enq-product"
            required
            error={err.productSlug?.message}
          >
            <Select id="enq-product" aria-invalid={!!err.productSlug} {...register("productSlug")}>
              <option value="">{isCard ? "Select a card" : "Select a loan"}</option>
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
          {!isCard && (
            <Field label="Preferred tenure" htmlFor="enq-tenure" error={err.tenureMonths?.message}>
              <Select id="enq-tenure" {...register("tenureMonths")}>
                <option value="">No preference</option>
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
              label="Purpose (optional)"
              htmlFor="enq-purpose"
              error={err.loanPurpose?.message}
            >
              <Input
                id="enq-purpose"
                placeholder="e.g. Buying a home, business expansion"
                {...register("loanPurpose")}
              />
            </Field>
          )}
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <Legend>About you</Legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Full name" htmlFor="enq-name" required error={err.name?.message}>
            <Input
              id="enq-name"
              autoComplete="name"
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
              placeholder="10-digit mobile"
              aria-invalid={!!err.phone}
              {...register("phone")}
            />
          </Field>
          <Field label="PIN code" htmlFor="enq-pin" required error={err.pincode?.message}>
            <Input
              id="enq-pin"
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="6-digit PIN"
              aria-invalid={!!err.pincode}
              {...register("pincode")}
            />
          </Field>
          <Field label="City" htmlFor="enq-city" error={err.city?.message}>
            <Input id="enq-city" autoComplete="address-level2" {...register("city")} />
          </Field>
          <Field label="Email" htmlFor="enq-email" error={err.email?.message}>
            <Input
              id="enq-email"
              type="email"
              autoComplete="email"
              aria-invalid={!!err.email}
              {...register("email")}
            />
          </Field>
          <Field label="Residence" htmlFor="enq-residence" error={err.residenceType?.message}>
            <Select id="enq-residence" {...register("residenceType")}>
              <option value="">Select</option>
              {residenceTypes.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <Legend>Employment &amp; income</Legend>
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
              <option value="">Select</option>
              {employmentTypes.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Net monthly income (₹)"
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
            label="Employer / business name"
            htmlFor="enq-employer"
            error={err.employerName?.message}
          >
            <Input id="enq-employer" {...register("employerName")} />
          </Field>
          <Field
            label="Experience / vintage (years)"
            htmlFor="enq-exp"
            error={err.experienceYears?.message}
          >
            <Input
              id="enq-exp"
              inputMode="numeric"
              placeholder="e.g. 6"
              {...register("experienceYears")}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className={`space-y-5${isCard ? " hidden" : ""}`}>
        <Legend>Obligations &amp; assets</Legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Current EMIs / month (₹)"
            htmlFor="enq-emi"
            error={err.existingEmi?.message}
          >
            <Input
              id="enq-emi"
              inputMode="numeric"
              placeholder="0 if none"
              {...register("existingEmi")}
            />
          </Field>
          {showAsset && (
            <Field
              label="Property / asset value (₹)"
              htmlFor="enq-asset"
              error={err.assetValue?.message}
            >
              <Input
                id="enq-asset"
                inputMode="numeric"
                placeholder="e.g. 6000000"
                {...register("assetValue")}
              />
            </Field>
          )}
          {showTurnover && (
            <Field
              label="Annual turnover (₹)"
              htmlFor="enq-turnover"
              error={err.annualTurnover?.message}
            >
              <Input
                id="enq-turnover"
                inputMode="numeric"
                placeholder="e.g. 12000000"
                {...register("annualTurnover")}
              />
            </Field>
          )}
        </div>
      </fieldset>

      <Field
        label="Anything else we should know?"
        htmlFor="enq-message"
        error={err.message?.message}
      >
        <Textarea
          id="enq-message"
          placeholder="Existing offers to beat, timelines, co-applicant details…"
          {...register("message")}
        />
      </Field>

      <label className="flex gap-3 text-sm leading-relaxed text-navy-600">
        <Checkbox
          aria-invalid={!!err.consent}
          aria-describedby={err.consent ? "enq-consent-error" : undefined}
          {...register("consent")}
        />
        <span>
          I authorise TrueLend to contact me about this application via phone, WhatsApp or email.
          This consent overrides my DND registration.
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
          className="w-full sm:w-auto"
        >
          {formState.isSubmitting ? "Submitting…" : "Request a Callback"}
        </Button>
        <TurnstilePendingHint show={!turnstileReady && !turnstileError} />
      </div>
    </form>
  );
}
