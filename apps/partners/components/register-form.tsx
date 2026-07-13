"use client";

import { useActionState, useState } from "react";
import { Briefcase, UserRoundPlus } from "lucide-react";
import { Button, Field, Input, cx } from "@truelend/ui";
import { registerPartner, type RegisterState } from "@/lib/signup-actions";

const types = [
  {
    value: "business",
    label: "Business Partner",
    desc: "I distribute financial products and want to source loans.",
    icon: Briefcase,
  },
  {
    value: "referral",
    label: "Referral Partner",
    desc: "I want to refer people from my network and earn incentives.",
    icon: UserRoundPlus,
  },
] as const;

export function RegisterForm() {
  const [type, setType] = useState<"business" | "referral">("business");
  const [state, action, pending] = useActionState<RegisterState, FormData>(registerPartner, {});

  return (
    <form action={action} className="space-y-6">
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-navy-800">I want to join as</legend>
        <input type="hidden" name="type" value={type} />
        <div className="grid gap-3 sm:grid-cols-2">
          {types.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              aria-pressed={type === t.value}
              className={cx(
                "flex flex-col gap-1 rounded-xl border p-4 text-left transition-colors",
                type === t.value
                  ? "border-navy-800 bg-navy-800/[0.04]"
                  : "border-hairline hover:border-navy-800/40",
              )}
            >
              <t.icon
                className={cx("h-5 w-5", type === t.value ? "text-red-600" : "text-navy-400")}
                aria-hidden
              />
              <span className="mt-1 font-semibold text-navy-950">{t.label}</span>
              <span className="text-xs leading-relaxed text-navy-500">{t.desc}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="name" required>
          <Input id="name" name="name" autoComplete="name" required />
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
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Password" htmlFor="password" required>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>
        {type === "business" && (
          <Field label="Business / firm name" htmlFor="businessName" className="sm:col-span-2">
            <Input id="businessName" name="businessName" autoComplete="organization" />
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

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Creating your account…" : "Create partner account"}
      </Button>
    </form>
  );
}
