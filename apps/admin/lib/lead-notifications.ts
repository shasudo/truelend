import { eq } from "drizzle-orm";
import { schema, type Database } from "@truelend/db";
import {
  isCustomerNotifiableLeadStatus,
  isPartnerNotifiableLeadStatus,
  notifyLeadStatusChanged,
  notifyPartnerLeadStatusChanged,
} from "@truelend/email";
import { scheduleAdminBackgroundTask } from "./request-context-cleanup";

/*
 * Lead-status notification, shared by the two writers that can move a lead:
 * the pipeline form and a loan-case outcome. It lives here rather than in
 * lead-actions.ts because a "use server" module may only export async
 * functions, so loan-actions.ts cannot import these from there.
 *
 * Deliberately no `import "server-only"`, unlike the sibling *-queries modules:
 * that specifier is a Next build-time alias with no Node resolution, and both
 * action test suites reach this module transitively, so adding it breaks them.
 * Reaching this from a client component is already impossible — it imports
 * @truelend/db, which repository-policy.test.ts forbids in a "use client" file.
 */

/*
 * Read after the transaction rather than widening its SELECT: the pipeline
 * audit row stores the pre-update lead verbatim, and the contact details needed
 * to send mail have no business being copied into the audit log.
 */
export async function leadNotificationTargets(db: Database, leadId: string) {
  const [lead] = await db
    .select({
      name: schema.leads.name,
      email: schema.leads.email,
      partnerId: schema.leads.partnerId,
    })
    .from(schema.leads)
    .where(eq(schema.leads.id, leadId))
    .limit(1);
  if (!lead) return undefined;
  if (!lead.partnerId) return { lead, partner: undefined };
  const [partner] = await db
    .select({ email: schema.user.email, name: schema.user.name })
    .from(schema.user)
    .where(eq(schema.user.id, lead.partnerId))
    .limit(1);
  return { lead, partner };
}

/*
 * Progress updates, unlike a verification decision, are backgrounded: the
 * pipeline is the most-used admin control and two awaited provider round-trips
 * would sit in front of every save. A failed send is a log line, not a lost
 * decision — the recipient learns the same thing on the next stage change.
 *
 * Only the provider calls are deferred. The reads above must stay on the live
 * request connection, because the same waitUntil queue also carries
 * `db.$client.end()` and a query issued after it is refused.
 */
export function scheduleLeadStatusNotifications(
  ctx: { waitUntil(promise: Promise<unknown>): void },
  env: CloudflareEnv,
  leadId: string,
  status: string,
  targets: NonNullable<Awaited<ReturnType<typeof leadNotificationTargets>>>,
): void {
  const { lead, partner } = targets;
  if (lead.email && isCustomerNotifiableLeadStatus(status)) {
    const to = lead.email;
    scheduleAdminBackgroundTask(ctx, "lead_status_notification_failed", () =>
      notifyLeadStatusChanged(env, {
        to,
        name: lead.name,
        status,
        idempotencyKey: `lead_status:${leadId}:${status}`,
      }),
    );
  }
  if (partner?.email && isPartnerNotifiableLeadStatus(status)) {
    const to = partner.email;
    scheduleAdminBackgroundTask(ctx, "partner_lead_status_notification_failed", () =>
      notifyPartnerLeadStatusChanged(env, {
        to,
        name: partner.name,
        leadName: lead.name ?? "your referral",
        status,
        dashboardUrl: `${env.PARTNERS_URL}/dashboard`,
        idempotencyKey: `partner_lead_status:${leadId}:${status}`,
      }),
    );
  }
}

/**
 * Sends the stage notification when a status change warrants one. Callers pass
 * the status they just committed; an unchanged status must not reach here, or
 * the applicant re-receives mail they already had.
 */
export async function notifyLeadStatusIfWarranted(
  db: Database,
  ctx: { waitUntil(promise: Promise<unknown>): void },
  env: CloudflareEnv,
  leadId: string,
  status: string,
): Promise<void> {
  if (!isCustomerNotifiableLeadStatus(status) && !isPartnerNotifiableLeadStatus(status)) return;
  const targets = await leadNotificationTargets(db, leadId);
  if (targets) scheduleLeadStatusNotifications(ctx, env, leadId, status, targets);
}
