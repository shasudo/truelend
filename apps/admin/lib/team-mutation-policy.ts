export interface BanMutationPlan {
  banned: boolean;
  changed: boolean;
  auditAction: "team.ban" | "team.unban";
}

/** Converts a requested access state into an idempotent mutation plan. */
export function planBanMutation(
  currentlyBanned: boolean,
  requestedBanned: boolean,
): BanMutationPlan {
  return {
    banned: requestedBanned,
    changed: currentlyBanned !== requestedBanned,
    auditAction: requestedBanned ? "team.ban" : "team.unban",
  };
}

interface StaffHistoryReferences {
  notes: boolean;
  cases: boolean;
  partnerReviews: boolean;
}

/** Stable refusal used before any irreversible staff deletion is attempted. */
export function staffDeletionRefusal(references: StaffHistoryReferences): string | null {
  if (!references.notes && !references.cases && !references.partnerReviews) return null;
  return "This teammate has notes, loan cases, or Referral Partner reviews on record, so they can't be deleted while that history is retained. Ban them instead.";
}
