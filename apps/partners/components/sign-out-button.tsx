"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { cx } from "@truelend/ui";
import { authClient } from "@truelend/auth/client";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  async function signOut() {
    if (pending) return;
    setPending(true);
    setError(undefined);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("Sign out failed");
      router.push("/login");
      router.refresh();
    } catch {
      setError("Could not sign out. Please try again.");
      setPending(false);
    }
  }
  return (
    <div>
      <button
        onClick={signOut}
        disabled={pending}
        className={cx(
          "inline-flex items-center gap-2 text-sm font-medium text-navy-600 transition-colors hover:text-red-700 disabled:opacity-60",
          className,
        )}
      >
        <LogOut className="h-4 w-4" aria-hidden />
        {pending ? "Signing out…" : "Sign out"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
