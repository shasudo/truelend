"use client";

import { useActionState, useRef, useEffect } from "react";
import { Button, Field, Input, Select } from "@truelend/ui";
import { createUserAction, type CreateUserState } from "@/lib/team-actions";

export function CreateUserForm() {
  const [state, action, pending] = useActionState<CreateUserState, FormData>(createUserAction, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="name" required>
          <Input id="name" name="name" autoComplete="off" required />
        </Field>
        <Field label="Email" htmlFor="email" required>
          <Input id="email" name="email" type="email" autoComplete="off" required />
        </Field>
        <Field label="Temporary password" htmlFor="password" required>
          <Input
            id="password"
            name="password"
            type="text"
            autoComplete="off"
            minLength={8}
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
        <p className="rounded-lg border border-navy-800/15 bg-navy-800/[0.05] px-4 py-3 text-sm text-navy-700">
          User created. Share the password with them to sign in.
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create user"}
      </Button>
    </form>
  );
}
