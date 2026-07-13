"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Checkbox, Field, Input } from "@truelend/ui";
import { cibilNotifySchema } from "@/lib/schemas";
import {
  FormSuccess,
  RootError,
  TurnstileField,
  TurnstilePendingHint,
  useLeadForm,
} from "./lead-form";

export function NotifyForm() {
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
  } = useLeadForm(zodResolver(cibilNotifySchema), {
    kind: "cibil_notify",
    email: "",
    consent: false,
  });
  const { register, formState } = form;
  const err = formState.errors;

  if (succeeded) {
    return (
      <FormSuccess
        title="You're on the list."
        sub="We'll email you the day free CIBIL score checks go live — nothing else."
        showWhatsApp={false}
      />
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <noscript>
        <p className="text-sm text-red-700">This form needs JavaScript enabled to submit.</p>
      </noscript>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Field
          label="Email address"
          htmlFor="cib-email"
          required
          error={err.email?.message}
          className="flex-1"
        >
          <Input
            id="cib-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={!!err.email}
            {...register("email")}
          />
        </Field>
        <Button
          type="submit"
          size="lg"
          disabled={formState.isSubmitting || !turnstileReady}
          className="sm:mt-7 sm:self-start"
        >
          {formState.isSubmitting ? "Adding…" : "Notify Me"}
        </Button>
      </div>
      <label className="flex gap-3 text-sm leading-relaxed text-navy-600">
        <Checkbox
          aria-invalid={!!err.consent}
          aria-describedby={err.consent ? "cib-consent-error" : undefined}
          {...register("consent")}
        />
        <span>Email me once when this launches. No newsletters, no spam.</span>
      </label>
      {err.consent && (
        <p id="cib-consent-error" role="alert" className="text-sm text-red-600">
          {err.consent.message}
        </p>
      )}

      <TurnstileField
        resetKey={turnstileKey}
        onToken={setToken}
        onExpire={resetToken}
        onError={failTurnstile}
      />
      <TurnstilePendingHint show={!turnstileReady && !turnstileError} />
      <RootError message={rootError ?? turnstileError} />
    </form>
  );
}
