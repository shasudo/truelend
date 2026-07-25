import type { Metadata } from "next";
import { Card, Logo } from "@truelend/ui";
import { LoginForm } from "@truelend/auth/forms";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-5">
      <div className="text-navy-800">
        <Logo />
      </div>
      <Card className="w-full max-w-sm p-8">
        <h1 className="font-display text-xl font-extrabold tracking-tight text-navy-950">
          Admin sign in
        </h1>
        <p className="mt-1 text-sm text-navy-500">Internal access only.</p>
        <LoginForm redirectTo="/" />
      </Card>
    </main>
  );
}
