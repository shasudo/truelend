"use client";

import { useActionState } from "react";
import { Field, Input, SubmitButton } from "@truelend/ui";
import { updateProfileAction, type ProfileState } from "@/lib/profile-actions";

export function ProfileForm({
  defaultName,
  defaultPhone,
}: {
  defaultName: string;
  defaultPhone: string;
}) {
  const [state, action] = useActionState<ProfileState, FormData>(updateProfileAction, {});

  return (
    <form action={action} className="space-y-5">
      <Field label="Name" htmlFor="name" required>
        <Input
          id="name"
          name="name"
          defaultValue={defaultName}
          autoComplete="name"
          maxLength={120}
          required
        />
      </Field>
      <Field label="Phone" htmlFor="phone" required>
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="numeric"
          placeholder="10-digit mobile"
          defaultValue={defaultPhone}
          required
        />
      </Field>

      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p role="status" className="text-sm text-navy-700">
          Profile updated.
        </p>
      )}

      <SubmitButton pendingText="Saving…">Save changes</SubmitButton>
    </form>
  );
}
