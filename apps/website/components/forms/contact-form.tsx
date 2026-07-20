"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LockKeyhole, Send } from "lucide-react";
import { Button, Checkbox, Field, Input, Select, Textarea } from "@truelend/ui";
import { contactReasonValues, contactSchema } from "@/lib/schemas";
import {
  FormSuccess,
  NoScriptFallback,
  RootError,
  TurnstileField,
  TurnstilePendingHint,
  useLeadForm,
} from "./lead-form";

const contactReasonLabels: Record<(typeof contactReasonValues)[number], string> = {
  borrowing_advice: "Borrowing advice",
  existing_enquiry: "An existing enquiry",
  partnership: "Partnership opportunity",
  general_question: "General question",
  other: "Something else",
};

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
    reason: "",
    name: "",
    phone: "",
    email: "",
    subject: "",
    message: "",
    consent: false,
  });
  const { register, formState, watch } = form;
  const err = formState.errors;
  const messageLength = watch("message").length;

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
      <Field label="How can we help you?" htmlFor="con-reason" required error={err.reason?.message}>
        <Select id="con-reason" aria-invalid={!!err.reason} {...register("reason")}>
          <option value="">Select an option</option>
          {contactReasonValues.map((reason) => (
            <option key={reason} value={reason}>
              {contactReasonLabels[reason]}
            </option>
          ))}
        </Select>
      </Field>
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
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Email address" htmlFor="con-email" required error={err.email?.message}>
          <Input
            id="con-email"
            type="email"
            autoComplete="email"
            aria-invalid={!!err.email}
            placeholder="Enter your email"
            {...register("email")}
          />
        </Field>
        <Field label="Subject (optional)" htmlFor="con-subject" error={err.subject?.message}>
          <Input
            id="con-subject"
            placeholder="Short subject"
            aria-invalid={!!err.subject}
            {...register("subject")}
          />
        </Field>
      </div>
      <Field label="Your message" htmlFor="con-message" required error={err.message?.message}>
        <div className="relative">
          <Textarea
            id="con-message"
            maxLength={1000}
            placeholder="Type your message here…"
            className="min-h-32 pb-8"
            aria-invalid={!!err.message}
            aria-describedby="con-message-count"
            {...register("message")}
          />
          <span
            id="con-message-count"
            className="absolute bottom-2.5 right-3.5 text-xs tabular-nums text-muted"
            aria-live="polite"
          >
            {messageLength}/1000
          </span>
        </div>
      </Field>

      <label className="flex gap-3 text-sm leading-relaxed text-navy-600">
        <Checkbox
          aria-invalid={!!err.consent}
          aria-describedby={err.consent ? "con-consent-error" : undefined}
          {...register("consent")}
        />
        <span>
          I authorise TrueLend to contact me regarding my enquiry by phone, email or WhatsApp.
        </span>
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
          className="w-full"
        >
          <Send className="h-4 w-4" aria-hidden />
          {formState.isSubmitting ? "Sending…" : "Send Message"}
        </Button>
        <TurnstilePendingHint show={!turnstileReady && !turnstileError} />
        <p className="flex items-center justify-center gap-2 text-sm text-navy-600">
          <LockKeyhole className="h-4 w-4 text-navy-800" aria-hidden />
          Your information is safe and secure with us.
        </p>
      </div>
    </form>
  );
}
