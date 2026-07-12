"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Checkbox, Field, Input, Select } from "@truelend/ui";
import { referralSchema } from "@/lib/schemas";
import { products } from "@/content/products";
import { FormSuccess, RootError, TurnstileField, useLeadForm } from "./lead-form";

export function ReferralForm() {
  const { form, onSubmit, succeeded, rootError, turnstileKey, setToken } = useLeadForm(
    zodResolver(referralSchema),
    {
      kind: "referral",
      referrerName: "",
      referrerPhone: "",
      name: "",
      phone: "",
      productSlug: "",
      consent: false,
    },
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
    <form onSubmit={onSubmit} noValidate className="space-y-6">
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
        </div>
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
      </fieldset>

      <label className="flex gap-3 text-sm leading-relaxed text-navy-600">
        <Checkbox aria-invalid={!!err.consent} {...register("consent")} />
        <span>
          I confirm my friend knows I&rsquo;m sharing their number and is happy to hear from
          TrueLend.
        </span>
      </label>
      {err.consent && (
        <p role="alert" className="text-sm text-red-600">
          {err.consent.message}
        </p>
      )}

      <TurnstileField resetKey={turnstileKey} onToken={setToken} />
      <RootError message={rootError} />

      <Button
        type="submit"
        size="lg"
        disabled={formState.isSubmitting}
        className="w-full sm:w-auto"
      >
        {formState.isSubmitting ? "Submitting…" : "Submit Referral"}
      </Button>
    </form>
  );
}
