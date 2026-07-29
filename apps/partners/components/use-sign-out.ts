"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@truelend/auth/client";

export function useSignOut() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  async function signOut() {
    if (pending) return;
    setPending(true);
    setError(undefined);
    try {
      const { error } = await authClient.signOut();
      if (error) throw new Error("Sign out failed");
      router.push("/login");
      router.refresh();
    } catch {
      setError("Could not sign out. Please try again.");
      setPending(false);
    }
  }
  return { signOut, pending, error };
}
