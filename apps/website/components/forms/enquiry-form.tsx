"use client";

import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Checkbox, Field, Input, Select, Textarea } from "@truelend/ui";
import { enquirySchema } from "@/lib/schemas";
import { products, productBySlug } from "@/content/products";
import {
  FormSuccess,
  RootError,
  TurnstileField,
  TurnstilePendingHint,
  useLeadForm,
} from "./lead-form";

export function EnquiryForm() {
  const requested = useSearchParams().get("product") ?? "";
  const defaultProduct = productBySlug(requested)?.slug ?? "";

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
  } = useLeadForm(zodResolver(enquirySchema), {
    kind: "enquiry",
    name: "",
    phone: "",
    email: "",
    city: "",
    productSlug: defaultProduct,
    message: "",
    consent: false,
  });
  const { register, formState } = form;
  const err = formState.errors;

  if (succeeded) {
    return (
      <FormSuccess
        title="Enquiry received."
        sub="An advisor will call you within one working day — from our number, once, and only about this enquiry."
      />
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <noscript>
        <p className="text-sm text-red-700">This form needs JavaScript enabled to submit.</p>
      </noscript>
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
        <Field label="Email" htmlFor="enq-email" error={err.email?.message}>
          <Input
            id="enq-email"
            type="email"
            autoComplete="email"
            aria-invalid={!!err.email}
            {...register("email")}
          />
        </Field>
        <Field label="City" htmlFor="enq-city" error={err.city?.message}>
          <Input id="enq-city" autoComplete="address-level2" {...register("city")} />
        </Field>
      </div>

      <Field label="Which product are you exploring?" htmlFor="enq-product">
        <Select id="enq-product" {...register("productSlug")}>
          <option value="">Not sure yet — help me decide</option>
          {products.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Anything we should know?" htmlFor="enq-message" error={err.message?.message}>
        <Textarea
          id="enq-message"
          placeholder="Loan amount, timelines, an existing offer you want beaten…"
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
          I authorise TrueLend to contact me about this enquiry via phone, WhatsApp or email. This
          consent overrides my DND registration.
        </span>
      </label>
      {err.consent && (
        <p id="enq-consent-error" role="alert" className="text-sm text-red-600">
          {err.consent.message}
        </p>
      )}

      <TurnstileField
        resetKey={turnstileKey}
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
