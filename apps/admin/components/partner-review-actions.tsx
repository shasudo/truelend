"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Field, SubmitButton, Textarea } from "@truelend/ui";
import {
  approvePartnerAction,
  rejectPartnerAction,
  revokePartnerAction,
  type PartnerReviewResult,
} from "@/lib/partner-actions";

const initialState: PartnerReviewResult = {};

function ActionFeedback({ state, success }: { state: PartnerReviewResult; success: string }) {
  if (state.error) {
    return (
      <p
        role="alert"
        className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
      >
        {state.error}
      </p>
    );
  }
  if (state.ok) {
    return (
      <p role="status" className="mt-2 text-sm text-navy-700">
        {success}
      </p>
    );
  }
  return null;
}

export function PartnerReviewActions({
  partnerId,
  partnerName,
  verified,
  canApprove,
  approvalBlockedMessage,
  canReject,
  rejectionBlockedMessage,
}: {
  partnerId: string;
  partnerName: string;
  verified: boolean;
  canApprove: boolean;
  approvalBlockedMessage: string | null;
  canReject: boolean;
  rejectionBlockedMessage: string | null;
}) {
  const router = useRouter();
  const [approvalState, approveAction] = useActionState<PartnerReviewResult, FormData>(
    approvePartnerAction,
    initialState,
  );
  const [rejectionState, rejectAction] = useActionState<PartnerReviewResult, FormData>(
    rejectPartnerAction,
    initialState,
  );
  const [revocationState, revokeAction] = useActionState<PartnerReviewResult, FormData>(
    revokePartnerAction,
    initialState,
  );

  useEffect(() => {
    if (
      approvalState.ok ||
      approvalState.uncertain ||
      rejectionState.ok ||
      rejectionState.uncertain ||
      revocationState.ok ||
      revocationState.uncertain
    ) {
      router.refresh();
    }
  }, [approvalState, rejectionState, revocationState, router]);

  if (verified) {
    return (
      <>
        <p className="mt-2 text-sm text-navy-500">
          Verified — this Referral Partner has portal access.
        </p>
        <form action={revokeAction} className="mt-4">
          <input type="hidden" name="partnerId" value={partnerId} />
          <SubmitButton
            variant="outline"
            className="w-full"
            pendingText="Revoking…"
            confirm="Revoke verification and return this Referral Partner to pending? They'll lose portal access until re-approved."
          >
            Revoke verification
          </SubmitButton>
          <ActionFeedback state={revocationState} success="Verification revoked." />
        </form>
      </>
    );
  }

  return (
    <>
      <form action={approveAction} className="mt-4">
        <input type="hidden" name="partnerId" value={partnerId} />
        <SubmitButton
          className="w-full"
          disabled={!canApprove}
          pendingText="Approving…"
          confirm={`Approve ${partnerName} as a Referral Partner and grant portal access? A confirmation email will be queued.`}
        >
          <Check className="h-4 w-4" aria-hidden /> Approve Referral Partner
        </SubmitButton>
        {approvalBlockedMessage && (
          <p className="mt-2 text-xs text-muted">{approvalBlockedMessage}</p>
        )}
        <ActionFeedback state={approvalState} success="Referral Partner approved." />
      </form>

      <form action={rejectAction} className="mt-3 space-y-2">
        <input type="hidden" name="partnerId" value={partnerId} />
        <Field label="Rejection reason" htmlFor="rejection-reason" required>
          <Textarea
            id="rejection-reason"
            name="reason"
            required
            maxLength={500}
            placeholder="Shown to the Referral Partner"
            className="min-h-16 text-sm"
            disabled={!canReject}
          />
        </Field>
        <SubmitButton
          variant="outline"
          className="w-full text-red-700 hover:bg-red-50"
          disabled={!canReject}
          pendingText="Rejecting…"
          confirm={`Reject ${partnerName}'s Referral Partner application and queue the decision email?`}
        >
          <X className="h-4 w-4" aria-hidden /> Reject
        </SubmitButton>
        {rejectionBlockedMessage && <p className="text-xs text-muted">{rejectionBlockedMessage}</p>}
        <ActionFeedback state={rejectionState} success="Application rejected." />
      </form>
    </>
  );
}
