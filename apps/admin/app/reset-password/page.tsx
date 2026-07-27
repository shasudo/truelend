import type { Metadata } from "next";
import { Card, Logo } from "@truelend/ui";
import { ResetPasswordForm } from "@truelend/auth/forms";

export const metadata: Metadata = {
  title: "Set a new password",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-5 py-12">
      <div className="text-navy-800">
        <Logo />
      </div>
      <Card className="w-full max-w-sm p-6 sm:p-8">
        <h1 className="font-display text-xl font-extrabold tracking-tight text-navy-950">
          Set a new password
        </h1>
        <p className="mt-1 text-sm text-navy-500">Choose a new password for your account.</p>
        <ResetPasswordForm token={token} tokenError={error} />
      </Card>
    </main>
  );
}
