import type { Metadata } from "next";
import Link from "next/link";
import { Card, Logo } from "@truelend/ui";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-5 py-12">
      <Link href="/" aria-label="TrueLend Partners home" className="text-navy-800">
        <Logo tagline />
      </Link>
      <Card className="w-full max-w-sm p-8">
        <h1 className="font-display text-xl font-extrabold tracking-tight text-navy-950">
          Partner sign in
        </h1>
        <p className="mt-1 text-sm text-navy-500">Access your partner dashboard.</p>
        <LoginForm />
      </Card>
    </main>
  );
}
