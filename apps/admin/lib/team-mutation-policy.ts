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

/**
 * Refuses the mutation that would leave the organisation with no usable admin.
 *
 * Kept out of planBanMutation deliberately: that function is about ban/unban
 * idempotency and also runs on the unban path, where this refusal must not
 * apply. A target who is already banned is not an active admin, so demoting or
 * deleting them can never be the last-admin case.
 *
 * Honest scope: the three callers already refuse to act on the acting admin's
 * own account, and the actor is by definition an active admin, so a single
 * sequential mutation can never reach zero — this is a backstop for a future
 * bulk or scripted path, not a guard that fires today. The lockout that IS
 * reachable is two admins banning each other concurrently; both read a count of
 * two and both proceed. Closing that needs a lock around the read and the write,
 * which better-auth's separate connection prevents.
 * ponytail: recovery is `pnpm --filter @truelend/admin seed:admin`. Add an
 * advisory lock if the admin roster ever grows past a handful of people.
 */
export function lastAdminRefusal(
  target: { role: string | null; banned: boolean | null },
  activeAdmins: number,
  intent: "demote" | "ban" | "remove",
): string | null {
  if (target.role !== "admin" || target.banned === true) return null;
  if (activeAdmins > 1) return null;
  const verb = intent === "demote" ? "demoted" : intent === "ban" ? "banned" : "deleted";
  return `This is the only active admin, so they can't be ${verb}. Promote another teammate to admin first.`;
}

interface StaffHistoryReferences {
  notes: boolean;
  cases: boolean;
  partnerReviews: boolean;
  assignedLeads: boolean;
  assignedCallTasks: boolean;
}

/** Stable refusal used before any irreversible staff deletion is attempted. */
export function staffDeletionRefusal(references: StaffHistoryReferences): string | null {
  if (references.notes || references.cases || references.partnerReviews) {
    return "This teammate has notes, loan cases, or Referral Partner reviews on record, so they can't be deleted while that history is retained. Ban them instead.";
  }
  // Without this the delete succeeds and the FK's onDelete: "set null" silently
  // unassigns their entire book — no audit row, no prompt, no way to find out
  // whose work went back to the pool. Banning them first clears the book.
  if (references.assignedLeads || references.assignedCallTasks) {
    return "This teammate still has leads or call tasks assigned to them. Ban them first to release that work, then delete the account.";
  }
  return null;
}
