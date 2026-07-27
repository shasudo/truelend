"use client";

import { useActionState } from "react";
import { Button, Field, Input, Textarea, useFormDraft } from "@truelend/ui";
import { savePartnerKyc, type KycState } from "@/lib/kyc-actions";
import type { KycFormValues } from "@/lib/kyc-form-values";

const kycFieldNames = [
  "pan",
  "occupation",
  "designation",
  "experienceNote",
  "address",
  "bankName",
  "accountHolder",
  "accountNumber",
  "bankBranch",
  "ifsc",
  "nomineeName",
  "nomineePhone",
] as const satisfies readonly (keyof KycFormValues)[];

export function KycDetailsForm({
  values,
  editable = true,
  storageKey,
}: {
  values: KycFormValues;
  editable?: boolean;
  storageKey: string;
}) {
  const [state, action, pending] = useActionState<KycState, FormData>(savePartnerKyc, {});
  const draft = useFormDraft({
    storageKey,
    fields: kycFieldNames,
    enabled: editable,
    error: state.error,
    success: state.ok,
    resultKey: state,
  });

  return (
    <form
      ref={draft.formRef}
      action={action}
      onInput={draft.onInput}
      onChange={draft.onChange}
      onSubmit={draft.onSubmit}
      className="space-y-5"
    >
      {/* Native fieldset[disabled] freezes every control inside, incl. submit,
          when KYC is locked (under review / verified). */}
      <fieldset disabled={!editable} className="space-y-8">
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="PAN number" htmlFor="pan" required>
              <Input
                id="pan"
                name="pan"
                defaultValue={values.pan ?? ""}
                placeholder="ABCDE1234F"
                autoCapitalize="characters"
                maxLength={10}
                className="uppercase"
                required
              />
            </Field>
          </div>
        </div>

        <fieldset className="space-y-5">
          <legend className="text-sm font-medium text-navy-800">Professional profile</legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Occupation" htmlFor="occupation" required>
              <Input
                id="occupation"
                name="occupation"
                defaultValue={values.occupation ?? ""}
                maxLength={120}
                required
              />
            </Field>
            <Field label="Designation" htmlFor="designation" required>
              <Input
                id="designation"
                name="designation"
                defaultValue={values.designation ?? ""}
                maxLength={120}
                required
              />
            </Field>
          </div>
          <Field label="Experience (if any)" htmlFor="experienceNote">
            <Textarea
              id="experienceNote"
              name="experienceNote"
              defaultValue={values.experienceNote ?? ""}
              className="min-h-16"
              maxLength={500}
            />
          </Field>
        </fieldset>

        <div className="space-y-5">
          <Field label="Current address" htmlFor="address" required>
            <Textarea
              id="address"
              name="address"
              defaultValue={values.address ?? ""}
              placeholder="House / office, street, city, state, PIN"
              className="min-h-20"
              maxLength={500}
              required
            />
          </Field>
        </div>

        <fieldset className="space-y-5">
          <legend className="text-sm font-medium text-navy-800">
            Bank account (for referral incentives)
          </legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Bank name" htmlFor="bankName" required>
              <Input
                id="bankName"
                name="bankName"
                defaultValue={values.bankName ?? ""}
                maxLength={120}
                required
              />
            </Field>
            <Field label="Account holder name" htmlFor="accountHolder" required>
              <Input
                id="accountHolder"
                name="accountHolder"
                defaultValue={values.accountHolder ?? ""}
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
                defaultValue={values.accountNumber ?? ""}
                required
              />
            </Field>
            <Field label="Branch" htmlFor="bankBranch" required>
              <Input
                id="bankBranch"
                name="bankBranch"
                defaultValue={values.bankBranch ?? ""}
                maxLength={120}
                required
              />
            </Field>
            <Field label="IFSC code" htmlFor="ifsc" required>
              <Input
                id="ifsc"
                name="ifsc"
                defaultValue={values.ifsc ?? ""}
                placeholder="HDFC0001234"
                autoCapitalize="characters"
                maxLength={11}
                className="uppercase"
                required
              />
            </Field>
          </div>
        </fieldset>

        <fieldset className="space-y-5">
          <legend className="text-sm font-medium text-navy-800">Nominee details</legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nominee name" htmlFor="nomineeName" required>
              <Input
                id="nomineeName"
                name="nomineeName"
                defaultValue={values.nomineeName ?? ""}
                maxLength={160}
                required
              />
            </Field>
            <Field label="Nominee mobile number" htmlFor="nomineePhone" required>
              <Input
                id="nomineePhone"
                name="nomineePhone"
                type="tel"
                inputMode="numeric"
                placeholder="10-digit mobile"
                defaultValue={values.nomineePhone ?? ""}
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
