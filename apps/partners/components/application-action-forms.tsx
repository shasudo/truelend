"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { SubmitButton } from "@truelend/ui";
import { reopenApplication, submitForReview, type KycState } from "@/lib/kyc-actions";

const initialState: KycState = {};

function useRefreshApplicationStatus(succeeded: boolean | undefined) {
  const router = useRouter();
  useEffect(() => {
    if (!succeeded) return;
    router.replace("/dashboard");
    router.refresh();
  }, [router, succeeded]);
}

export function SubmitForReviewForm() {
  const [state, action] = useActionState<KycState, FormData>(submitForReview, initialState);
  useRefreshApplicationStatus(state.ok);
  return (
    <form action={action}>
      <SubmitButton size="lg" pendingText="Submitting…">
        <Send className="h-4 w-4" aria-hidden />
        Submit application
      </SubmitButton>
      {state.error && (
        <p role="alert" className="mt-2 max-w-sm text-sm text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function ReopenApplicationForm() {
  const [state, action] = useActionState<KycState, FormData>(reopenApplication, initialState);
  useRefreshApplicationStatus(state.ok);
  return (
    <form action={action}>
      <SubmitButton
        className="w-full min-[480px]:w-auto"
        pendingText="Reopening…"
        confirm="Reopen your application for editing? You'll need to submit it again for review."
      >
        Edit Application
      </SubmitButton>
      {state.error && (
        <p role="alert" className="mt-2 max-w-sm text-sm text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}
