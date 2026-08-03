"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, count, eq, inArray, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { schema, type Database } from "@truelend/db";
import { notifyStaffAccountEvent } from "@truelend/email";
import { type ActionResult } from "./action-result";
import { createAuthContext } from "./auth";
import { errorType } from "./error-type";
import {
  scheduleAdminBackgroundTask,
  scheduleAdminRequestContextCleanup,
} from "./request-context-cleanup";
import { lastAdminRefusal, planBanMutation, staffDeletionRefusal } from "./team-mutation-policy";

const ROLES = ["admin", "employee"] as const;

// better-auth's admin plugin types `role` as "admin" | "user" | (...)[] |
// undefined; it has no concept of TrueLend's "employee" role, but the runtime
// stores whatever string is passed, verbatim, regardless of that narrower
// type. The input here is honestly typed to our real two roles; the cast on
// the way out is a deliberate, unavoidable boundary bridge into better-auth's
// own type, not a claim that the value is actually "admin".
const asRole = (r: (typeof ROLES)[number]) => r as "admin";

async function adminContext() {
  const { auth, db, ctx, env } = createAuthContext();
  try {
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });
    return { auth, db, ctx, env, h, me: session?.user ?? null };
  } catch (error) {
    scheduleAdminRequestContextCleanup({ db, ctx });
    throw error;
  }
}

type TeamAdminContext = Awaited<ReturnType<typeof adminContext>>;

async function withTeamAdminContext<TResult>(
  event: string,
  fallback: () => TResult,
  run: (context: TeamAdminContext) => Promise<TResult>,
): Promise<TResult> {
  let context: TeamAdminContext | undefined;
  try {
    context = await adminContext();
    return await run(context);
  } catch (error) {
    console.error(JSON.stringify({ event, errorType: errorType(error) }));
    return fallback();
  } finally {
    if (context) scheduleAdminRequestContextCleanup(context);
  }
}

/*
 * Why the audit rows in this module use `db.insert` rather than `tx.insert`:
 * every one of them records an `auth.api.*` call, and better-auth performs that
 * write on its own connection. A transaction around our insert would wrap a
 * single statement and be atomic with nothing — it would look like a guarantee
 * without being one. The row is written last instead, so a missing row means
 * the audit insert failed after a successful account change, which the action
 * already reports as `uncertain`.
 *
 * The ban path is the exception: it also releases the teammate's assigned work,
 * which is our own write, so there the audit row genuinely belongs in the same
 * transaction.
 */

/*
 * The target plus the number of admins who could still sign in without them.
 * Counted here rather than at each caller so demote, ban and delete cannot
 * drift apart. `banned` is nullable with no default (better-auth owns the
 * column), so "not banned" has to be written three-valued.
 *
 * ponytail: the count is read outside better-auth's write, so no lock can span
 * it — two admins simultaneously acting on the last two admin accounts can
 * still race to zero. Recovery is `pnpm --filter @truelend/admin seed:admin`.
 * Add an advisory lock if the admin count ever grows past a handful.
 */
async function staffTarget(db: Database, userId: string) {
  const [target] = await db
    .select({
      id: schema.user.id,
      email: schema.user.email,
      role: schema.user.role,
      banned: schema.user.banned,
    })
    .from(schema.user)
    .where(and(eq(schema.user.id, userId), inArray(schema.user.role, ROLES)))
    .limit(1);
  if (!target) return null;
  const [admins] = await db
    .select({ total: count() })
    .from(schema.user)
    .where(
      and(
        eq(schema.user.role, "admin"),
        or(isNull(schema.user.banned), eq(schema.user.banned, false)),
      ),
    );
  return { ...target, activeAdmins: Number(admins?.total ?? 0) };
}

export type BanActionResult = ActionResult & { banned?: boolean };

export type CreateUserResult = ActionResult & {
  createdEmail?: string;
};

const createSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  email: z.email("Enter a valid email"),
  role: z.enum(ROLES),
});

export async function createUserAction(
  _prev: CreateUserResult,
  formData: FormData,
): Promise<CreateUserResult> {
  return withTeamAdminContext<CreateUserResult>(
    "team_create_context_failed",
    () => ({
      error: "We couldn't confirm teammate creation. Refresh the team list before trying again.",
      uncertain: true,
    }),
    async ({ auth, db, ctx, env, h, me }) => {
      let createdUserId: string | undefined;
      try {
        if (me?.role !== "admin") return { error: "Not authorized" };
        const parsed = createSchema.safeParse(Object.fromEntries(formData));
        if (!parsed.success) {
          return { error: parsed.error.issues[0]?.message ?? "Please check the fields." };
        }
        const created = await auth.api.createUser({
          body: {
            name: parsed.data.name,
            email: parsed.data.email,
            // Never disclose or transport a staff password. This random credential
            // is immediately superseded by the single-use activation/reset link.
            password: `${crypto.randomUUID()}${crypto.randomUUID()}`,
            role: asRole(parsed.data.role),
          },
          headers: h,
        });
        createdUserId = created.user.id;
        await auth.api.requestPasswordReset({
          body: { email: parsed.data.email, redirectTo: "/reset-password" },
          headers: h,
        });
        await db.insert(schema.auditLog).values({
          actorId: me.id,
          actorEmail: me.email,
          action: "team.create",
          entityType: "user",
          entityId: created.user.id,
          after: { email: parsed.data.email, role: parsed.data.role, activationSent: true },
        });
        scheduleAdminBackgroundTask(ctx, "staff_account_notification_failed", () =>
          notifyStaffAccountEvent(env, {
            event: "created",
            staffEmail: parsed.data.email,
            staffName: parsed.data.name,
            role: parsed.data.role,
            actorEmail: me.email,
            idempotencyKey: `staff_account:created:${created.user.id}`,
          }),
        );
        revalidatePath("/team");
        return { ok: true, createdEmail: parsed.data.email };
      } catch (error) {
        if (createdUserId) {
          try {
            await auth.api.removeUser({ body: { userId: createdUserId }, headers: h });
          } catch (cleanupError) {
            console.error(
              JSON.stringify({
                event: "team_create_cleanup_failed",
                userId: createdUserId,
                errorType: errorType(cleanupError),
              }),
            );
          }
        }
        console.error(
          JSON.stringify({
            event: "team_create_failed",
            cleanupAttempted: Boolean(createdUserId),
            errorType: errorType(error),
          }),
        );
        return {
          error:
            "We couldn't confirm teammate creation. Refresh the team list before trying again.",
          uncertain: true,
        };
      }
    },
  );
}

const roleSchema = z.object({ userId: z.string().min(1), role: z.enum(ROLES) });

export async function setRoleAction(formData: FormData): Promise<ActionResult> {
  return withTeamAdminContext<ActionResult>(
    "team_role_update_failed",
    () => ({
      error: "We couldn't confirm the role update. Refresh the team list before trying again.",
      uncertain: true,
    }),
    async ({ auth, db, ctx, env, h, me }) => {
      if (me?.role !== "admin") return { error: "Not authorized." };
      const parsed = roleSchema.safeParse(Object.fromEntries(formData));
      if (!parsed.success) return { error: "Invalid request." };
      // Don't let an admin demote themselves and risk locking everyone out.
      if (parsed.data.userId === me.id && parsed.data.role !== "admin")
        return { error: "You can't remove your own admin access." };
      const target = await staffTarget(db, parsed.data.userId);
      if (!target) return { error: "Teammate not found." };
      if (parsed.data.role !== "admin") {
        const refusal = lastAdminRefusal(target, target.activeAdmins, "demote");
        if (refusal) return { error: refusal };
      }
      await auth.api.setRole({
        body: { userId: parsed.data.userId, role: asRole(parsed.data.role) },
        headers: h,
      });
      await db.insert(schema.auditLog).values({
        actorId: me.id,
        actorEmail: me.email,
        action: "team.role_update",
        entityType: "user",
        entityId: target.id,
        before: { role: target.role },
        after: { role: parsed.data.role },
      });
      // Deliberately unkeyed: keying on (user, role) would swallow the second
      // alert of an admin → employee → admin flip inside the provider's 24-hour
      // window. A duplicate alert in the team inbox beats a missing one about a
      // privilege change.
      scheduleAdminBackgroundTask(ctx, "staff_account_notification_failed", () =>
        notifyStaffAccountEvent(env, {
          event: "role_changed",
          staffEmail: target.email,
          role: parsed.data.role,
          actorEmail: me.email,
        }),
      );
      revalidatePath("/team");
      return { ok: true };
    },
  );
}

const banSchema = z.object({
  userId: z.string().min(1),
  banned: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export async function setBanAction(formData: FormData): Promise<BanActionResult> {
  let observedBanned: boolean | undefined;
  return withTeamAdminContext<BanActionResult>(
    "team_access_update_failed",
    () => ({
      error: "We couldn't confirm the access update. Refresh the team list before trying again.",
      uncertain: true,
      banned: observedBanned,
    }),
    async ({ auth, db, h, me }) => {
      if (me?.role !== "admin") return { error: "Not authorized." };
      const parsed = banSchema.safeParse(Object.fromEntries(formData));
      if (!parsed.success) return { error: "Invalid request." };
      if (parsed.data.userId === me.id) return { error: "You can't ban your own account." };
      const target = await staffTarget(db, parsed.data.userId);
      if (!target) return { error: "Teammate not found." };
      const currentlyBanned = target.banned === true;
      const plan = planBanMutation(currentlyBanned, parsed.data.banned);
      if (!plan.changed) return { ok: true, banned: plan.banned };
      if (plan.banned) {
        const refusal = lastAdminRefusal(target, target.activeAdmins, "ban");
        if (refusal) return { error: refusal };
      }
      const updated = plan.banned
        ? await auth.api.banUser({ body: { userId: parsed.data.userId }, headers: h })
        : await auth.api.unbanUser({ body: { userId: parsed.data.userId }, headers: h });
      observedBanned = updated.user.banned === true;
      if (observedBanned !== plan.banned) {
        throw new Error("Access update returned an unexpected state");
      }
      if (plan.banned) {
        // The UI promises "They'll be signed out immediately". Nothing here
        // made that true — it rested entirely on better-auth plugin internals.
        await auth.api.revokeUserSessions({ body: { userId: parsed.data.userId }, headers: h });
      }
      await db.transaction(async (tx) => {
        let unassignedLeads = 0;
        let unassignedCallTasks = 0;
        if (plan.banned) {
          // A banned teammate disappears from every assignee dropdown but their
          // book stayed pointed at them, so the work was invisible and the lead
          // form's assignee select defaulted to an option that no longer
          // renders. Release it, and record how much was released.
          const [leadCount] = await tx
            .select({ total: count() })
            .from(schema.leads)
            .where(eq(schema.leads.assignedTo, parsed.data.userId));
          const [taskCount] = await tx
            .select({ total: count() })
            .from(schema.callTasks)
            .where(eq(schema.callTasks.assignedTo, parsed.data.userId));
          unassignedLeads = Number(leadCount?.total ?? 0);
          unassignedCallTasks = Number(taskCount?.total ?? 0);
          await tx
            .update(schema.leads)
            .set({ assignedTo: null })
            .where(eq(schema.leads.assignedTo, parsed.data.userId));
          await tx
            .update(schema.callTasks)
            .set({ assignedTo: null })
            .where(eq(schema.callTasks.assignedTo, parsed.data.userId));
        }
        await tx.insert(schema.auditLog).values({
          actorId: me.id,
          actorEmail: me.email,
          action: plan.auditAction,
          entityType: "user",
          entityId: target.id,
          before: { banned: currentlyBanned },
          after: {
            banned: observedBanned,
            sessionsRevoked: plan.banned,
            unassignedLeads,
            unassignedCallTasks,
          },
        });
      });
      revalidatePath("/team");
      revalidatePath("/leads");
      revalidatePath("/crm");
      return { ok: true, banned: observedBanned };
    },
  );
}

const passwordResetSchema = z.object({
  userId: z.string().min(1),
});

export async function sendPasswordResetAction(formData: FormData): Promise<ActionResult> {
  return withTeamAdminContext<ActionResult>(
    "team_password_reset_request_failed",
    () => ({
      error:
        "We couldn't confirm whether sessions were revoked or the reset link was sent. Check with the teammate before trying again.",
      uncertain: true,
    }),
    async ({ auth, db, h, me }) => {
      if (me?.role !== "admin") return { error: "Not authorized." };
      const parsed = passwordResetSchema.safeParse(Object.fromEntries(formData));
      if (!parsed.success) return { error: "Invalid request." };
      const target = await staffTarget(db, parsed.data.userId);
      if (!target) return { error: "Teammate not found." };
      await auth.api.revokeUserSessions({ body: { userId: parsed.data.userId }, headers: h });
      await auth.api.requestPasswordReset({
        body: { email: target.email, redirectTo: "/reset-password" },
        headers: h,
      });
      await db.insert(schema.auditLog).values({
        actorId: me.id,
        actorEmail: me.email,
        action: "team.password_reset_requested",
        entityType: "user",
        entityId: target.id,
        after: { sessionsRevoked: true, resetLinkSent: true },
      });
      return { ok: true };
    },
  );
}

const removeSchema = z.object({ userId: z.string().min(1) });

export async function removeUserAction(formData: FormData): Promise<ActionResult> {
  return withTeamAdminContext<ActionResult>(
    "team_remove_failed",
    () => ({
      error: "We couldn't confirm deletion. Refresh the team list before trying again.",
      uncertain: true,
    }),
    async ({ auth, db, h, me }) => {
      if (me?.role !== "admin") return { error: "Not authorized." };
      const parsed = removeSchema.safeParse(Object.fromEntries(formData));
      if (!parsed.success) return { error: "Invalid request." };
      if (parsed.data.userId === me.id) return { error: "You can't delete your own account." };
      const target = await staffTarget(db, parsed.data.userId);
      if (!target) return { error: "Teammate not found." };
      const lockout = lastAdminRefusal(target, target.activeAdmins, "remove");
      if (lockout) return { error: lockout };
      // Authored records have restrictive FKs, while partner review rows require
      // verified_by to remain present. Refuse deletion rather than break history.
      // Assigned work has the opposite problem: its FK is onDelete "set null",
      // so without a probe the delete silently empties their whole book.
      const [notes, cases, partnerReviews, assignedLeads, assignedCallTasks] = await Promise.all([
        db
          .select({ id: schema.leadNotes.id })
          .from(schema.leadNotes)
          .where(eq(schema.leadNotes.authorId, parsed.data.userId))
          .limit(1),
        db
          .select({ id: schema.loanCases.id })
          .from(schema.loanCases)
          .where(eq(schema.loanCases.createdBy, parsed.data.userId))
          .limit(1),
        db
          .select({ userId: schema.partners.userId })
          .from(schema.partners)
          .where(eq(schema.partners.verifiedBy, parsed.data.userId))
          .limit(1),
        db
          .select({ id: schema.leads.id })
          .from(schema.leads)
          .where(eq(schema.leads.assignedTo, parsed.data.userId))
          .limit(1),
        db
          .select({ id: schema.callTasks.id })
          .from(schema.callTasks)
          .where(eq(schema.callTasks.assignedTo, parsed.data.userId))
          .limit(1),
      ]);
      const refusal = staffDeletionRefusal({
        notes: notes.length > 0,
        cases: cases.length > 0,
        partnerReviews: partnerReviews.length > 0,
        assignedLeads: assignedLeads.length > 0,
        assignedCallTasks: assignedCallTasks.length > 0,
      });
      if (refusal) return { error: refusal };
      await auth.api.removeUser({ body: { userId: parsed.data.userId }, headers: h });
      await db.insert(schema.auditLog).values({
        actorId: me.id,
        actorEmail: me.email,
        action: "team.remove",
        entityType: "user",
        entityId: target.id,
        before: { email: target.email, role: target.role, banned: target.banned },
      });
      revalidatePath("/team");
      return { ok: true };
    },
  );
}
