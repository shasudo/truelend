import type { Metadata } from "next";
import Link from "next/link";
import { Card, Logo } from "@truelend/ui";
import { LoginForm } from "@truelend/auth/forms";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-5 py-12">
      <Link href="/" aria-label="TrueLend Referral Partners home" className="text-navy-800">
        <Logo />
      </Link>
      <Card className="w-full max-w-sm p-8">
        <h1 className="font-display text-xl font-extrabold tracking-tight text-navy-950">
          Referral Partner sign in
        </h1>
        <p className="mt-1 text-sm text-navy-500">Access your Referral Partner dashboard.</p>
        <LoginForm redirectTo="/dashboard">
          <p className="text-center text-sm text-navy-500">
            New Referral Partner?{" "}
            <Link
              href="/register/referral"
              className="font-semibold text-red-600 hover:text-red-700"
            >
              Create an account
            </Link>
          </p>
        </LoginForm>
      </Card>
    </main>
  );
}
