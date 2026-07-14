"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { Button, Field, Input, Select, Textarea } from "@truelend/ui";
import {
  products,
  employmentTypes,
  residenceTypes,
  loanTenures,
  securedProducts,
  businessProducts,
} from "@truelend/reference";
import { submitLead, type LeadState } from "@/lib/lead-actions";

export function PartnerLeadForm({ variant }: { variant: "business" | "referral" }) {
  const [state, action, pending] = useActionState<LeadState, FormData>(submitLead, {});
  const formRef = useRef<HTMLFormElement>(null);
  const [product, setProduct] = useState("");
  const who = variant === "referral" ? "friend" : "customer";
  const Who = variant === "referral" ? "Friend's" : "Customer";
  const showAsset = securedProducts.has(product);
  const showTurnover = businessProducts.has(product);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setProduct("");
    }
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className="space-y-6">
      <fieldset className="space-y-5">
        <legend className="font-display text-sm font-bold uppercase tracking-[0.14em] text-navy-500">
          Loan requirement
        </legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Product they need" htmlFor="productSlug">
            <Select
              id="productSlug"
              name="productSlug"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
            >
              <option value="">Not sure / any</option>
              {products.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Loan amount (₹)" htmlFor="loanAmount">
            <Input
              id="loanAmount"
              name="loanAmount"
              inputMode="numeric"
              placeholder="e.g. 2500000"
            />
          </Field>
          <Field label="Preferred tenure" htmlFor="tenureMonths">
            <Select id="tenureMonths" name="tenureMonths" defaultValue="">
              <option value="">No preference</option>
              {loanTenures.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Purpose" htmlFor="loanPurpose">
            <Input id="loanPurpose" name="loanPurpose" maxLength={200} placeholder="Optional" />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="font-display text-sm font-bold uppercase tracking-[0.14em] text-navy-500">
          {who === "friend" ? "Your friend" : "Customer"}
        </legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={`${Who} name`} htmlFor="name" required>
            <Input id="name" name="name" autoComplete="off" maxLength={120} required />
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
            <Input id="email" name="email" type="email" autoComplete="off" maxLength={254} />
          </Field>
          <Field label="PIN code" htmlFor="pincode">
            <Input id="pincode" name="pincode" inputMode="numeric" placeholder="6-digit PIN" />
          </Field>
          <Field label="City" htmlFor="city">
            <Input id="city" name="city" autoComplete="off" maxLength={100} />
          </Field>
          <Field label="Residence" htmlFor="residenceType">
            <Select id="residenceType" name="residenceType" defaultValue="">
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
        <legend className="font-display text-sm font-bold uppercase tracking-[0.14em] text-navy-500">
          Employment &amp; income
        </legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Employment type" htmlFor="employmentType">
            <Select id="employmentType" name="employmentType" defaultValue="">
              <option value="">Select</option>
              {employmentTypes.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Net monthly income (₹)" htmlFor="monthlyIncome">
            <Input
              id="monthlyIncome"
              name="monthlyIncome"
              inputMode="numeric"
              placeholder="e.g. 80000"
            />
          </Field>
          <Field label="Employer / business name" htmlFor="employerName">
            <Input id="employerName" name="employerName" maxLength={160} />
          </Field>
          <Field label="Experience / vintage (years)" htmlFor="experienceYears">
            <Input
              id="experienceYears"
              name="experienceYears"
              inputMode="numeric"
              placeholder="e.g. 6"
            />
          </Field>
          <Field label="Current EMIs / month (₹)" htmlFor="existingEmi">
            <Input
              id="existingEmi"
              name="existingEmi"
              inputMode="numeric"
              placeholder="0 if none"
            />
          </Field>
          {showAsset && (
            <Field label="Property / asset value (₹)" htmlFor="assetValue">
              <Input
                id="assetValue"
                name="assetValue"
                inputMode="numeric"
                placeholder="e.g. 6000000"
              />
            </Field>
          )}
          {showTurnover && (
            <Field label="Annual turnover (₹)" htmlFor="annualTurnover">
              <Input
                id="annualTurnover"
                name="annualTurnover"
                inputMode="numeric"
                placeholder="e.g. 12000000"
              />
            </Field>
          )}
        </div>
      </fieldset>

      <Field label="Anything we should know?" htmlFor="message">
        <Textarea
          id="message"
          name="message"
          maxLength={2000}
          placeholder={`Timelines, why the ${who} is a good fit…`}
        />
      </Field>

      <label className="flex items-start gap-3 text-sm leading-relaxed text-navy-600">
        <input
          type="checkbox"
          name="consent"
          required
          className="mt-1 h-4 w-4 shrink-0 accent-navy-800"
        />
        <span>
          I confirm that this {who} authorized me to share these details with TrueLend and agreed to
          be contacted about lending products.
        </span>
      </label>

      {state.error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}
      {state.ok && (
        <p
          role="status"
          className="rounded-lg border border-navy-800/15 bg-navy-800/[0.05] px-4 py-3 text-sm text-navy-700"
        >
          {variant === "referral" ? "Referral" : "Loan case"} submitted — our team will take it from
          here and you can track it on your dashboard.
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Submitting…" : variant === "referral" ? "Submit referral" : "Submit loan case"}
      </Button>
    </form>
  );
}
