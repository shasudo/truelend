"use client";

import { useState, type FormEvent } from "react";
import { Button, Card, Checkbox, Field, Input } from "@truelend/ui";
import {
  bankApplyProducts,
  bankName,
  normalizeIndianMobile,
  validationMessages,
  validationPatterns,
  type BankApplyProduct,
} from "@truelend/reference";
import { startBankApply } from "@/lib/bank-apply-actions";
import { RootError, TurnstileField } from "./lead-form";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

interface QuickApplyFlowProps {
  refCode?: string;
}

export function QuickApplyFlow({ refCode }: QuickApplyFlowProps) {
  const [step, setStep] = useState<"phone" | "catalog">("phone");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [phoneError, setPhoneError] = useState<string>();
  const [consentError, setConsentError] = useState<string>();

  const [turnstileKey, setTurnstileKey] = useState(0);
  const [turnstileToken, setTurnstileToken] = useState<string>();
  const [turnstileError, setTurnstileError] = useState<string>();
  const turnstileReady = !TURNSTILE_SITE_KEY || turnstileToken !== undefined;

  const [applyingTo, setApplyingTo] = useState<string>();
  const [rootError, setRootError] = useState<string>();

  // Local gate only — no server round-trip. Turnstile fires once, at the
  // point a product is actually chosen and the record is actually stored.
  function continueToCatalog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeIndianMobile(phone);
    const validPhone = validationPatterns.indianMobile.test(normalized);
    setPhoneError(validPhone ? undefined : validationMessages.indianMobile);
    setConsentError(consent ? undefined : "Please accept to continue");
    if (!validPhone || !consent) return;
    setPhone(normalized);
    setStep("catalog");
  }

  async function applyTo(product: BankApplyProduct) {
    // A non-trackable product (e.g. HDFC's static DSA link) has nowhere to
    // send a tracking code and no bank_apply_leads row to create — it's a
    // plain redirect, no server round-trip needed.
    if (!product.trackable) {
      window.location.href = product.buildApplyUrl("");
      return;
    }
    setRootError(undefined);
    setApplyingTo(product.slug);
    try {
      const result = await startBankApply({
        productSlug: product.slug,
        phone,
        consent,
        turnstileToken,
        ref: refCode,
      });
      if (result.ok) {
        window.location.href = result.redirectUrl;
        return;
      }
      setRootError(result.error);
    } catch {
      setRootError("The request could not be sent. Check your connection and try again.");
    } finally {
      setApplyingTo(undefined);
      setTurnstileToken(undefined);
      setTurnstileError(undefined);
      setTurnstileKey((k) => k + 1);
    }
  }

  if (step === "phone") {
    return (
      <Card className="p-6 sm:p-8">
        <form onSubmit={continueToCatalog} className="space-y-5" noValidate>
          <Field label="Mobile number" htmlFor="qa-phone" required error={phoneError}>
            <Input
              id="qa-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="Enter 10 digit mobile number"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              aria-invalid={!!phoneError}
            />
          </Field>
          <label className="flex gap-3 text-sm leading-relaxed text-navy-600">
            <Checkbox
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              aria-invalid={!!consentError}
            />
            <span>
              I authorise TrueLend and its partner banks to contact me about this application on
              phone, WhatsApp or email. This consent overrides any DND registration.
            </span>
          </label>
          {consentError && (
            <p role="alert" className="text-sm text-red-600">
              {consentError}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full sm:w-auto">
            Continue
          </Button>
        </form>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {bankApplyProducts.map((product) => (
          <Card key={product.slug} className="p-6">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-red-600">
              {bankName(product.bankSlug)}
            </p>
            <h2 className="mt-1 font-display text-lg font-bold text-navy-950">{product.label}</h2>
            <Button
              className="mt-4 w-full"
              disabled={product.trackable && (!turnstileReady || applyingTo === product.slug)}
              onClick={() => void applyTo(product)}
            >
              {applyingTo === product.slug ? "Redirecting…" : "Apply Now"}
            </Button>
          </Card>
        ))}
      </div>
      <TurnstileField
        resetKey={turnstileKey}
        action="bank_apply_start"
        onToken={setTurnstileToken}
        onExpire={() => setTurnstileToken(undefined)}
        onError={() =>
          setTurnstileError("Human verification could not load. Refresh the page and try again.")
        }
      />
      <RootError message={rootError ?? turnstileError} />
    </div>
  );
}
