"use client";

import { useActionState, useEffect, useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { Button, Field, Input } from "@truelend/ui";
import { registerPartner, type RegisterState } from "@/lib/signup-actions";

export function RegisterForm({
  type,
  siteKey,
}: {
  type: "business" | "referral";
  siteKey?: string;
}) {
  const [turnstileToken, setTurnstileToken] = useState<string>();
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [turnstileError, setTurnstileError] = useState<string>();
  const [state, action, pending] = useActionState<RegisterState, FormData>(registerPartner, {});

  useEffect(() => {
    if (!state.error) return;
    setTurnstileToken(undefined);
    setTurnstileKey((key) => key + 1);
  }, [state]);

  return (
    <form action={action} aria-busy={pending} className="space-y-6">
      <input type="hidden" name="type" value={type} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="name" required>
          <Input id="name" name="name" autoComplete="name" maxLength={120} required />
        </Field>
        <Field label="Mobile number" htmlFor="phone" required>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            placeholder="10-digit mobile"
            required
          />
        </Field>
        <Field label="Email" htmlFor="email" required>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
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
            required
          />
        </Field>
        {type === "business" && (
          <Field
            label="Business / firm name"
            htmlFor="businessName"
            className="sm:col-span-2"
            required
          >
            <Input
              id="businessName"
              name="businessName"
              autoComplete="organization"
              maxLength={160}
              required
            />
          </Field>
        )}
      </div>

      {state.error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}

      <input type="hidden" name="turnstileToken" value={turnstileToken ?? ""} />
      {siteKey && (
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
          options={{ theme: "light", action: "partner_registration" }}
        />
      )}
      {turnstileError && (
        <p role="alert" className="text-sm text-red-700">
          {turnstileError}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={pending || Boolean(siteKey && !turnstileToken)}
        className="w-full"
      >
        {pending ? "Creating your account…" : "Create partner account"}
      </Button>
    </form>
  );
}
