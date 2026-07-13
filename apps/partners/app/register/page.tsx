import type { Metadata } from "next";
import Link from "next/link";
import { Card, Logo } from "@truelend/ui";
import { RegisterForm } from "@/components/register-form";

export const metadata: Metadata = {
  title: "Become a partner",
  description: "Register as a TrueLend business or referral partner.",
  alternates: { canonical: "/register" },
};

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-5 py-12">
      <Link href="/" aria-label="TrueLend Partners home" className="text-navy-800">
        <Logo tagline />
      </Link>
      <Card className="w-full max-w-xl p-8">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy-950">
          Become a TrueLend partner
        </h1>
        <p className="mt-1 text-sm text-navy-500">
          Create your account, upload your documents, and start earning once verified.
        </p>
        <div className="mt-6">
          <RegisterForm />
        </div>
        <p className="mt-6 text-center text-sm text-navy-500">
          Already a partner?{" "}
          <Link href="/login" className="font-semibold text-red-600 hover:text-red-700">
            Sign in
          </Link>
        </p>
      </Card>
    </main>
  );
}
