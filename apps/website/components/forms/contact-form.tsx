"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Checkbox, Field, Input, Textarea } from "@truelend/ui";
import { contactSchema } from "@/lib/schemas";
import {
  FormSuccess,
  NoScriptFallback,
  RootError,
  TurnstileField,
  TurnstilePendingHint,
  useLeadForm,
} from "./lead-form";

export function ContactForm() {
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
  } = useLeadForm(zodResolver(contactSchema), {
    kind: "contact",
    name: "",
    phone: "",
    email: "",
    message: "",
    consent: false,
  });
  const { register, formState } = form;
  const err = formState.errors;

  if (succeeded) {
    return (
      <FormSuccess
        title="Message sent."
        sub="Thanks for writing in — we usually reply within a working day."
      />
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <NoScriptFallback />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" htmlFor="con-name" required error={err.name?.message}>
          <Input
            id="con-name"
            autoComplete="name"
            aria-invalid={!!err.name}
            {...register("name")}
          />
        </Field>
        <Field label="Mobile number" htmlFor="con-phone" required error={err.phone?.message}>
          <Input
            id="con-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="10-digit mobile"
            aria-invalid={!!err.phone}
            {...register("phone")}
          />
        </Field>
      </div>
      <Field label="Email" htmlFor="con-email" error={err.email?.message}>
        <Input
          id="con-email"
          type="email"
          autoComplete="email"
          aria-invalid={!!err.email}
          {...register("email")}
        />
      </Field>
      <Field label="How can we help?" htmlFor="con-message" required error={err.message?.message}>
        <Textarea id="con-message" aria-invalid={!!err.message} {...register("message")} />
      </Field>

      <label className="flex gap-3 text-sm leading-relaxed text-navy-600">
        <Checkbox
          aria-invalid={!!err.consent}
          aria-describedby={err.consent ? "con-consent-error" : undefined}
          {...register("consent")}
        />
        <span>I&rsquo;m happy for TrueLend to respond to this message by phone or email.</span>
      </label>
      {err.consent && (
        <p id="con-consent-error" role="alert" className="text-sm text-red-600">
          {err.consent.message}
        </p>
      )}

      <TurnstileField
        resetKey={turnstileKey}
        action="lead_contact"
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
          {formState.isSubmitting ? "Sending…" : "Send Message"}
        </Button>
        <TurnstilePendingHint show={!turnstileReady && !turnstileError} />
      </div>
    </form>
  );
}
