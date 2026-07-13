"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Field, Input } from "@truelend/ui";
import { authClient } from "@truelend/auth/client";

export function ResetPasswordForm({ token, tokenError }: { token?: string; tokenError?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);

  // better-auth redirects an invalid/expired link back here with ?error=…
  if (!token || tokenError) {
    return (
      <p className="mt-6 text-sm text-navy-600">
        This reset link is invalid or has expired.{" "}
        <Link href="/forgot-password" className="font-semibold text-red-600 hover:text-red-700">
          Request a new one
        </Link>
        .
      </p>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== String(form.get("confirm"))) return setError("The passwords don't match.");
    setPending(true);
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    setPending(false);
    if (error) {
      setError(error.message ?? "Couldn't reset your password — the link may have expired.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="mt-6 space-y-4">
        <p
          role="status"
          className="rounded-lg border border-navy-800/15 bg-navy-800/[0.05] px-4 py-3 text-sm text-navy-700"
        >
          Your password has been updated.
        </p>
        <Button asChild className="w-full">
          <Link href="/login">Go to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <Field label="New password" htmlFor="password" required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>
      <Field label="Confirm password" htmlFor="confirm" required>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
