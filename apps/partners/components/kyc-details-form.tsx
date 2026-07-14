"use client";

import { useActionState } from "react";
import { Button, Checkbox, Field, Input, Textarea } from "@truelend/ui";
import { partnerProductOptions, paiseToRupeesInput } from "@truelend/reference";
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
      <fieldset disabled={!editable} className="space-y-8">
        {/* type is immutable — the server re-checks it against the DB row. */}
        <input type="hidden" name="type" value={partner.type} />

        <div className="space-y-5">
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
            {business && (
              <Field label="Alternative mobile number" htmlFor="alternatePhone">
                <Input
                  id="alternatePhone"
                  name="alternatePhone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="10-digit mobile"
                  defaultValue={partner.alternatePhone ?? ""}
                />
              </Field>
            )}
          </div>
        </div>

        {business ? (
          <fieldset className="space-y-5">
            <legend className="text-sm font-medium text-navy-800">Professional profile</legend>
            <fieldset>
              <legend className="mb-2 text-sm text-navy-700">
                Products handled <span className="text-red-600">*</span>
              </legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {partnerProductOptions.map((product) => (
                  <label key={product} className="flex items-start gap-2 text-sm text-navy-700">
                    <Checkbox
                      name="productsHandled"
                      value={product}
                      defaultChecked={partner.productsHandled?.includes(product) ?? false}
                    />
                    {product}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Years of experience in financial services distribution"
                htmlFor="yearsExperience"
                required
              >
                <Input
                  id="yearsExperience"
                  name="yearsExperience"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={99}
                  defaultValue={partner.yearsExperience ?? ""}
                  required
                />
              </Field>
            </div>
            <fieldset className="space-y-5">
              <legend className="text-sm text-navy-700">Current monthly volume (₹)</legend>
              <div className="grid gap-5 sm:grid-cols-3">
                <Field label="Loans" htmlFor="monthlyVolumeLoans" required>
                  <Input
                    id="monthlyVolumeLoans"
                    name="monthlyVolumeLoans"
                    inputMode="numeric"
                    placeholder="0"
                    defaultValue={paiseToRupeesInput(partner.monthlyVolumeLoansPaise)}
                    required
                  />
                </Field>
                <Field label="Insurance" htmlFor="monthlyVolumeInsurance" required>
                  <Input
                    id="monthlyVolumeInsurance"
                    name="monthlyVolumeInsurance"
                    inputMode="numeric"
                    placeholder="0"
                    defaultValue={paiseToRupeesInput(partner.monthlyVolumeInsurancePaise)}
                    required
                  />
                </Field>
                <Field label="Mutual funds" htmlFor="monthlyVolumeMutualFunds" required>
                  <Input
                    id="monthlyVolumeMutualFunds"
                    name="monthlyVolumeMutualFunds"
                    inputMode="numeric"
                    placeholder="0"
                    defaultValue={paiseToRupeesInput(partner.monthlyVolumeMutualFundsPaise)}
                    required
                  />
                </Field>
              </div>
            </fieldset>
          </fieldset>
        ) : (
          <fieldset className="space-y-5">
            <legend className="text-sm font-medium text-navy-800">Professional profile</legend>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Occupation" htmlFor="occupation" required>
                <Input
                  id="occupation"
                  name="occupation"
                  defaultValue={partner.occupation ?? ""}
                  maxLength={120}
                  required
                />
              </Field>
              <Field label="Designation" htmlFor="designation" required>
                <Input
                  id="designation"
                  name="designation"
                  defaultValue={partner.designation ?? ""}
                  maxLength={120}
                  required
                />
              </Field>
            </div>
            <Field label="Experience (if any)" htmlFor="experienceNote">
              <Textarea
                id="experienceNote"
                name="experienceNote"
                defaultValue={partner.experienceNote ?? ""}
                className="min-h-16"
                maxLength={500}
              />
            </Field>
          </fieldset>
        )}

        <div className="space-y-5">
          <Field label={business ? "Office address" : "Current address"} htmlFor="address" required>
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
          {business && (
            <Field label="Residence address" htmlFor="residenceAddress" required>
              <Textarea
                id="residenceAddress"
                name="residenceAddress"
                defaultValue={partner.residenceAddress ?? ""}
                placeholder="House, street, city, state, PIN"
                className="min-h-20"
                maxLength={500}
                required
              />
            </Field>
          )}
        </div>

        <fieldset className="space-y-5">
          <legend className="text-sm font-medium text-navy-800">
            Bank account (for {business ? "payouts" : "incentives"})
          </legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Bank name" htmlFor="bankName" required>
              <Input
                id="bankName"
                name="bankName"
                defaultValue={partner.bankName ?? ""}
                maxLength={120}
                required
              />
            </Field>
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
            <Field label="Branch" htmlFor="bankBranch" required>
              <Input
                id="bankBranch"
                name="bankBranch"
                defaultValue={partner.bankBranch ?? ""}
                maxLength={120}
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

        <fieldset className="space-y-5">
          <legend className="text-sm font-medium text-navy-800">Nominee details</legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nominee name" htmlFor="nomineeName" required>
              <Input
                id="nomineeName"
                name="nomineeName"
                defaultValue={partner.nomineeName ?? ""}
                maxLength={160}
                required
              />
            </Field>
            <Field label="Nominee Aadhaar" htmlFor="nomineeAadhaar" required>
              <Input
                id="nomineeAadhaar"
                name="nomineeAadhaar"
                inputMode="numeric"
                placeholder="12-digit Aadhaar"
                maxLength={12}
                defaultValue={partner.nomineeAadhaar ?? ""}
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
                defaultValue={partner.nomineePhone ?? ""}
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
