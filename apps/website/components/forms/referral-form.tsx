"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Checkbox, Field, Input, Select } from "@truelend/ui";
import { products, employmentTypes, itrFiledOptions, loanTenures } from "@truelend/reference";
import { referralSchema } from "@/lib/lead-schemas";
import {
  FormSuccess,
  NoScriptFallback,
  RootError,
  TurnstileField,
  TurnstilePendingHint,
  useLeadForm,
} from "./lead-form";

export function ReferralForm() {
  const {
    form,
    draftFormRef,
    draftOnInput,
    draftOnChange,
    onSubmit,
    succeeded,
    rootError,
    turnstileKey,
    turnstileReady,
    turnstileError,
    setToken,
    resetToken,
    failTurnstile,
  } = useLeadForm(
    zodResolver(referralSchema),
    {
      kind: "referral",
      referrerName: "",
      referrerPhone: "",
      name: "",
      phone: "",
      productSlug: "",
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
      itrFiled: "",
      consent: false,
    },
    "referral",
  );
  const { register, formState } = form;
  const err = formState.errors;

  if (succeeded) {
    return (
      <FormSuccess
        title="Referral received."
        sub="We'll reach out to your friend gently and keep you posted. Thank you for the trust."
      />
    );
  }

  return (
    <form
      ref={draftFormRef}
      onSubmit={onSubmit}
      onInput={draftOnInput}
      onChange={draftOnChange}
      noValidate
      className="space-y-6"
    >
      <NoScriptFallback />
      <fieldset className="space-y-5">
        <legend className="font-display text-sm font-bold uppercase tracking-[0.14em] text-navy-500">
          About you
        </legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Your name" htmlFor="ref-rname" required error={err.referrerName?.message}>
            <Input
              id="ref-rname"
              autoComplete="name"
              aria-invalid={!!err.referrerName}
              {...register("referrerName")}
            />
          </Field>
          <Field
            label="Your mobile number"
            htmlFor="ref-rphone"
            required
            error={err.referrerPhone?.message}
          >
            <Input
              id="ref-rphone"
              type="tel"
              inputMode="numeric"
              placeholder="10-digit mobile"
              aria-invalid={!!err.referrerPhone}
              {...register("referrerPhone")}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="font-display text-sm font-bold uppercase tracking-[0.14em] text-navy-500">
          Your friend
        </legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Friend's name" htmlFor="ref-name" required error={err.name?.message}>
            <Input id="ref-name" aria-invalid={!!err.name} {...register("name")} />
          </Field>
          <Field
            label="Friend's mobile number"
            htmlFor="ref-phone"
            required
            error={err.phone?.message}
          >
            <Input
              id="ref-phone"
              type="tel"
              inputMode="numeric"
              placeholder="10-digit mobile"
              aria-invalid={!!err.phone}
              {...register("phone")}
            />
          </Field>
          <Field label="What are they looking for?" htmlFor="ref-product">
            <Select id="ref-product" {...register("productSlug")}>
              <option value="">Not sure</option>
              {products.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Loan amount (₹)" htmlFor="ref-amount" error={err.loanAmount?.message}>
            <Input
              id="ref-amount"
              inputMode="numeric"
              placeholder="If you know it"
              {...register("loanAmount")}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="font-display text-sm font-bold uppercase tracking-[0.14em] text-navy-500">
          Loan details <span className="font-medium normal-case tracking-normal">— optional</span>
        </legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Preferred tenure" htmlFor="ref-tenure" error={err.tenureMonths?.message}>
            <Select id="ref-tenure" {...register("tenureMonths")}>
              <option value="">No preference</option>
              {loanTenures.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Their PIN code" htmlFor="ref-pin" error={err.pincode?.message}>
            <Input
              id="ref-pin"
              inputMode="numeric"
              placeholder="6-digit PIN"
              aria-invalid={!!err.pincode}
              {...register("pincode")}
            />
          </Field>
          <Field
            label="Their employment"
            htmlFor="ref-employment"
            error={err.employmentType?.message}
          >
            <Select id="ref-employment" {...register("employmentType")}>
              <option value="">Not sure</option>
              {employmentTypes.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Their monthly income (₹)"
            htmlFor="ref-income"
            error={err.monthlyIncome?.message}
          >
            <Input
              id="ref-income"
              inputMode="numeric"
              placeholder="If you know it"
              {...register("monthlyIncome")}
            />
          </Field>
          <Field label="Do they file IT returns?" htmlFor="ref-itr" error={err.itrFiled?.message}>
            <Select id="ref-itr" {...register("itrFiled")}>
              <option value="">Not sure</option>
              {itrFiledOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </fieldset>

      <label className="flex gap-3 text-sm leading-relaxed text-navy-600">
        <Checkbox
          aria-invalid={!!err.consent}
          aria-describedby={err.consent ? "ref-consent-error" : undefined}
          {...register("consent")}
        />
        <span>
          I confirm my friend knows I&rsquo;m sharing their number and is happy to hear from
          TrueLend.
        </span>
      </label>
      {err.consent && (
        <p id="ref-consent-error" role="alert" className="text-sm text-red-600">
          {err.consent.message}
        </p>
      )}

      <TurnstileField
        resetKey={turnstileKey}
        action="lead_referral"
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
          {formState.isSubmitting ? "Submitting…" : "Submit Referral"}
        </Button>
        <TurnstilePendingHint show={!turnstileReady && !turnstileError} />
      </div>
    </form>
  );
}
