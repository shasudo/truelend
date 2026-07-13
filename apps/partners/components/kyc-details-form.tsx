"use client";

import { useActionState } from "react";
import { Button, Field, Input, Textarea } from "@truelend/ui";
import type { Partner } from "@truelend/db";
import { savePartnerKyc, type KycState } from "@/lib/kyc-actions";

export function KycDetailsForm({
  partner,
  editable = true,
}: {
  partner: Partner;
  editable?: boolean;
}) {
  const [state, action, pending] = useActionState<KycState, FormData>(savePartnerKyc, {});
  const business = partner.type === "business";

  return (
    <form action={action} className="space-y-5">
      {/* Native fieldset[disabled] freezes every control inside, incl. submit,
          when KYC is locked (under review / verified). */}
      <fieldset disabled={!editable} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="PAN number" htmlFor="pan" required>
            <Input
              id="pan"
              name="pan"
              defaultValue={partner.pan ?? ""}
              placeholder="ABCDE1234F"
              autoCapitalize="characters"
              maxLength={10}
              className="uppercase"
              required
            />
          </Field>
          {business && (
            <Field label="GST number (if registered)" htmlFor="gst">
              <Input
                id="gst"
                name="gst"
                defaultValue={partner.gst ?? ""}
                placeholder="22ABCDE1234F1Z5"
                autoCapitalize="characters"
                maxLength={15}
                className="uppercase"
              />
            </Field>
          )}
        </div>

        <Field label="Full address" htmlFor="address" required>
          <Textarea
            id="address"
            name="address"
            defaultValue={partner.address ?? ""}
            placeholder="House / office, street, city, state, PIN"
            className="min-h-20"
            maxLength={500}
            required
          />
        </Field>

        <fieldset className="space-y-5">
          <legend className="text-sm font-medium text-navy-800">
            Bank account (for {business ? "payouts" : "incentives"})
          </legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Account holder name" htmlFor="accountHolder" required>
              <Input
                id="accountHolder"
                name="accountHolder"
                defaultValue={partner.accountHolder ?? ""}
                maxLength={160}
                required
              />
            </Field>
            <Field label="Account number" htmlFor="accountNumber" required>
              <Input
                id="accountNumber"
                name="accountNumber"
                inputMode="numeric"
                minLength={9}
                maxLength={18}
                defaultValue={partner.accountNumber ?? ""}
                required
              />
            </Field>
            <Field label="IFSC code" htmlFor="ifsc" required>
              <Input
                id="ifsc"
                name="ifsc"
                defaultValue={partner.ifsc ?? ""}
                placeholder="HDFC0001234"
                autoCapitalize="characters"
                maxLength={11}
                className="uppercase"
                required
              />
            </Field>
          </div>
        </fieldset>

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
            Details saved.
          </p>
        )}

        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save details"}
        </Button>
      </fieldset>
    </form>
  );
}
