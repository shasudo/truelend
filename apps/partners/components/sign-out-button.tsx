"use client";

import { LogOut } from "lucide-react";
import { cx } from "@truelend/ui";
import { useSignOut } from "./use-sign-out";

interface SignOutButtonProps {
  className?: string;
}

export function SignOutButton({ className }: SignOutButtonProps) {
  const { signOut, pending, error } = useSignOut();
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
