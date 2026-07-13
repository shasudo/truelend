"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { cx } from "@truelend/ui";
import { authClient } from "@truelend/auth/client";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  async function signOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }
  return (
    <button
      onClick={signOut}
      className={cx(
        "inline-flex items-center gap-2 text-sm font-medium text-navy-600 transition-colors hover:text-red-700",
        className,
      )}
    >
      <LogOut className="h-4 w-4" aria-hidden />
      Sign out
    </button>
  );
}
