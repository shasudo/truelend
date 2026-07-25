"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Field, Input } from "@truelend/ui";
import { authClient } from "./client";

export function LoginForm({ redirectTo, children }: { redirectTo: string; children?: ReactNode }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    setPending(true);
    try {
      const form = new FormData(e.currentTarget);
      const { error } = await authClient.signIn.email({
        email: String(form.get("email")),
        password: String(form.get("password")),
      });
      if (error) {
        setError("Sign in failed — check your credentials.");
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("Sign in is temporarily unavailable. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} aria-busy={pending} className="mt-6 space-y-4">
      <Field label="Email" htmlFor="email" required>
        <Input id="email" name="email" type="email" autoComplete="email" maxLength={254} required />
      </Field>
      <Field label="Password" htmlFor="password" required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          maxLength={128}
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
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-sm text-navy-500">
        <Link href="/forgot-password" className="font-semibold text-navy-700 hover:text-navy-950">
          Forgot your password?
        </Link>
      </p>
      {children}
    </form>
  );
}

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string>();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    setPending(true);
    try {
      const form = new FormData(e.currentTarget);
      await authClient.requestPasswordReset({
        email: String(form.get("email")),
        redirectTo: "/reset-password",
      });
      // Keep the browser response identical for unknown accounts and server-side
      // delivery failures. The server still fails closed and records the failure.
      setSent(true);
    } catch {
      setError("Password recovery is temporarily unavailable. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    // Generic wording — don't reveal whether an account exists for that email.
    return (
      <p
        role="status"
        className="mt-6 rounded-lg border border-navy-800/15 bg-navy-800/[0.05] px-4 py-3 text-sm text-navy-700"
      >
        If an account exists for that email, we&rsquo;ve sent a link to reset your password. Check
        your inbox.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} aria-busy={pending} className="mt-6 space-y-4">
      <Field label="Email" htmlFor="email" required>
        <Input id="email" name="email" type="email" autoComplete="email" maxLength={254} required />
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
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}

export function ResetPasswordForm({ token, tokenError }: { token?: string; tokenError?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);

  useEffect(() => {
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

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

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));
    if (password.length < 8 || password.length > 128)
      return setError("Password must be between 8 and 128 characters.");
    if (password !== String(form.get("confirm"))) return setError("The passwords don't match.");
    setPending(true);
    try {
      const { error } = await authClient.resetPassword({ newPassword: password, token });
      if (error) {
        setError("Couldn't reset your password — the link may have expired.");
        return;
      }
      setDone(true);
    } catch {
      setError("The password could not be updated. Please try again.");
    } finally {
      setPending(false);
    }
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
    <form onSubmit={onSubmit} aria-busy={pending} className="mt-6 space-y-4">
      <Field label="New password" htmlFor="password" required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
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
          maxLength={128}
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
