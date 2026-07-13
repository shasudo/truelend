"use client";

import { useActionState, useRef, useEffect } from "react";
import { Button, Field, Input, Select, Textarea } from "@truelend/ui";
import { products } from "@truelend/reference";
import { submitLead, type LeadState } from "@/lib/lead-actions";

// Business partners submit a "customer"; referral partners refer a "friend".
export function PartnerLeadForm({ variant }: { variant: "business" | "referral" }) {
  const [state, action, pending] = useActionState<LeadState, FormData>(submitLead, {});
  const formRef = useRef<HTMLFormElement>(null);
  const who = variant === "referral" ? "friend" : "customer";

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label={`${variant === "referral" ? "Friend's" : "Customer"} name`}
          htmlFor="name"
          required
        >
          <Input id="name" name="name" autoComplete="off" required />
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
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="off" />
        </Field>
        <Field label="City" htmlFor="city">
          <Input id="city" name="city" autoComplete="off" />
        </Field>
      </div>
      <Field label="Product they need" htmlFor="productSlug">
        <Select id="productSlug" name="productSlug" defaultValue="">
          <option value="">Not sure / any</option>
          {products.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Anything we should know?" htmlFor="message">
        <Textarea
          id="message"
          name="message"
          placeholder={`Loan amount, timelines, why the ${who} is a good fit…`}
        />
      </Field>

      {state.error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-lg border border-navy-800/15 bg-navy-800/[0.05] px-4 py-3 text-sm text-navy-700">
          Lead submitted — our team will take it from here and you can track it on your dashboard.
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Submitting…" : variant === "referral" ? "Submit referral" : "Submit lead"}
      </Button>
    </form>
  );
}
