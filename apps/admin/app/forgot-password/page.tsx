import type { Metadata } from "next";
import Link from "next/link";
import { Card, Logo } from "@truelend/ui";
import { ForgotPasswordForm } from "@truelend/auth/forms";

export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-5 py-12">
      <div className="text-navy-800">
        <Logo />
      </div>
      <Card className="w-full max-w-sm p-6 sm:p-8">
        <h1 className="font-display text-xl font-extrabold tracking-tight text-navy-950">
          Reset your password
        </h1>
        <p className="mt-1 text-sm text-navy-500">
          Enter your email and we&rsquo;ll send you a reset link.
        </p>
        <ForgotPasswordForm />
        <p className="mt-4 text-center text-sm text-navy-500">
          <Link href="/login" className="font-semibold text-navy-700 hover:text-navy-950">
            Back to sign in
          </Link>
        </p>
      </Card>
    </main>
  );
}
