"use client";

import { useActionState } from "react";
import { Field, Input, SubmitButton, useFormDraft } from "@truelend/ui";
import { updateProfileAction, type ProfileState } from "@/lib/profile-actions";

export function ProfileForm({
  defaultName,
  defaultPhone,
  storageKey,
}: {
  defaultName: string;
  defaultPhone: string;
  storageKey: string;
}) {
  const [state, action] = useActionState<ProfileState, FormData>(updateProfileAction, {});
  const draft = useFormDraft({
    storageKey,
    fields: ["name", "phone"],
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
