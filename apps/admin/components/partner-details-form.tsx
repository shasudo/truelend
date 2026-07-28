"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Textarea } from "@truelend/ui";
import { updatePartnerDetailsAction, type ActionResult } from "@/lib/partner-actions";

type PartnerDetails = {
  userId: string;
  phone: string | null;
  dateOfBirth: string | null;
  city: string | null;
  referralType: string | null;
  occupation: string | null;
  designation: string | null;
  experienceNote: string | null;
  pan: string | null;
  address: string | null;
  bankName: string | null;
  accountHolder: string | null;
  accountNumber: string | null;
  bankBranch: string | null;
  ifsc: string | null;
  nomineeName: string | null;
  nomineeAadhaar: string | null;
  nomineePhone: string | null;
};

export function PartnerDetailsForm({ partner }: { partner: PartnerDetails }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    updatePartnerDetailsAction,
    {},
  );
  useEffect(() => {
    if (state.ok || state.uncertain) router.refresh();
  }, [router, state.ok, state.uncertain]);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="partnerId" value={partner.userId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone" htmlFor="partner-phone">
          <Input
            id="partner-phone"
            name="phone"
            defaultValue={partner.phone ?? ""}
            inputMode="tel"
          />
        </Field>
        <Field label="Date of birth" htmlFor="partner-date-of-birth">
          <Input
            id="partner-date-of-birth"
            name="dateOfBirth"
            type="date"
            defaultValue={partner.dateOfBirth ?? ""}
          />
        </Field>
        <Field label="City" htmlFor="partner-city">
          <Input id="partner-city" name="city" defaultValue={partner.city ?? ""} />
        </Field>
        <Field label="Referral type" htmlFor="partner-referral-type">
          <Input
            id="partner-referral-type"
            name="referralType"
            defaultValue={partner.referralType ?? ""}
          />
        </Field>
        <Field label="Occupation" htmlFor="partner-occupation">
          <Input
            id="partner-occupation"
            name="occupation"
            defaultValue={partner.occupation ?? ""}
          />
        </Field>
        <Field label="Designation" htmlFor="partner-designation">
          <Input
            id="partner-designation"
            name="designation"
            defaultValue={partner.designation ?? ""}
          />
        </Field>
      </div>
      <Field label="Experience" htmlFor="partner-experience">
        <Textarea
          id="partner-experience"
          name="experienceNote"
          maxLength={500}
          defaultValue={partner.experienceNote ?? ""}
        />
      </Field>
      <div className="border-t border-hairline pt-5">
        <h3 className="font-display text-base font-bold text-navy-950">KYC and payout details</h3>
        <p className="mt-1 text-sm text-muted">
          Updating verified KYC information returns the application to review.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="PAN" htmlFor="partner-pan">
          <Input id="partner-pan" name="pan" defaultValue={partner.pan ?? ""} />
        </Field>
        <Field label="Bank name" htmlFor="partner-bank-name">
          <Input id="partner-bank-name" name="bankName" defaultValue={partner.bankName ?? ""} />
        </Field>
        <Field label="Account holder" htmlFor="partner-account-holder">
          <Input
            id="partner-account-holder"
            name="accountHolder"
            defaultValue={partner.accountHolder ?? ""}
          />
        </Field>
        <Field label="Account number" htmlFor="partner-account-number">
          <Input
            id="partner-account-number"
            name="accountNumber"
            inputMode="numeric"
            defaultValue={partner.accountNumber ?? ""}
          />
        </Field>
        <Field label="Bank branch" htmlFor="partner-bank-branch">
          <Input
            id="partner-bank-branch"
            name="bankBranch"
            defaultValue={partner.bankBranch ?? ""}
          />
        </Field>
        <Field label="IFSC" htmlFor="partner-ifsc">
          <Input id="partner-ifsc" name="ifsc" defaultValue={partner.ifsc ?? ""} />
        </Field>
      </div>
      <Field label="Current address" htmlFor="partner-address">
        <Textarea
          id="partner-address"
          name="address"
          maxLength={500}
          defaultValue={partner.address ?? ""}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nominee name" htmlFor="partner-nominee-name">
          <Input
            id="partner-nominee-name"
            name="nomineeName"
            defaultValue={partner.nomineeName ?? ""}
          />
        </Field>
        <Field label="Nominee Aadhaar" htmlFor="partner-nominee-aadhaar">
          <Input
            id="partner-nominee-aadhaar"
            name="nomineeAadhaar"
            inputMode="numeric"
            defaultValue={partner.nomineeAadhaar ?? ""}
          />
        </Field>
        <Field label="Nominee mobile" htmlFor="partner-nominee-phone">
          <Input
            id="partner-nominee-phone"
            name="nomineePhone"
            inputMode="tel"
            defaultValue={partner.nomineePhone ?? ""}
          />
        </Field>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p role="status" className="text-sm text-navy-700">
          Partner details saved.
        </p>
      )}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Saving…" : "Save partner details"}
      </Button>
    </form>
  );
}
