"use client";

import { useActionState, useRef, useEffect } from "react";
import { Button, Field, Input, Select } from "@truelend/ui";
import { createUserAction, type CreateUserState } from "@/lib/team-actions";

export function CreateUserForm() {
  const [state, action, pending] = useActionState<CreateUserState, FormData>(createUserAction, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="name" required>
          <Input id="name" name="name" autoComplete="off" maxLength={120} required />
        </Field>
        <Field label="Email" htmlFor="email" required>
          <Input id="email" name="email" type="email" autoComplete="off" maxLength={254} required />
        </Field>
        <Field label="Temporary password" htmlFor="password" required>
          <Input
            id="password"
            name="password"
            type="text"
            autoComplete="off"
            minLength={8}
            maxLength={128}
            required
          />
        </Field>
        <Field label="Role" htmlFor="role">
          <Select id="role" name="role" defaultValue="employee">
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
          </Select>
        </Field>
      </div>

      {state.error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}
      {state.ok && (
        <div
          role="status"
          className="rounded-lg border border-navy-800/15 bg-navy-800/[0.05] px-4 py-3 text-sm text-navy-700"
        >
          <p className="font-semibold text-navy-950">User created — share these credentials.</p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt className="text-navy-500">Email</dt>
            <dd className="font-mono text-navy-950 break-all">{state.createdEmail}</dd>
            <dt className="text-navy-500">Password</dt>
            <dd className="font-mono text-navy-950 break-all">{state.tempPassword}</dd>
          </dl>
          <p className="mt-2 text-xs text-navy-500">
            This password won&apos;t be shown again once you create another user.
          </p>
        </div>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create user"}
      </Button>
    </form>
  );
}
