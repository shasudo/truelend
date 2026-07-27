"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { schema, type Database } from "@truelend/db";
import { createAuthContext } from "./auth";
import { scheduleAdminRequestContextCleanup } from "./request-context-cleanup";
import { planBanMutation, staffDeletionRefusal } from "./team-mutation-policy";

const ROLES = ["admin", "employee"] as const;

// better-auth's admin plugin types roles as "user" | "admin"; TrueLend stores
// employee and partner roles as plain text.
// Cast at the API boundary — the value is stored verbatim at runtime.
const asRole = (r: string): "admin" => r as "admin";
const errorType = (error: unknown) => (error instanceof Error ? error.name : "unknown");

async function adminContext() {
  const { auth, db, ctx } = createAuthContext();
  try {
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });
    return { auth, db, ctx, h, me: session?.user ?? null };
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
  return target ?? null;
}

export type ActionResult = { ok?: boolean; error?: string; uncertain?: boolean };

export type BanActionResult = ActionResult & { banned?: boolean };

export type CreateUserState = ActionResult & {
  createdEmail?: string;
};

const createSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  email: z.email("Enter a valid email"),
  role: z.enum(ROLES),
});

export async function createUserAction(
  _prev: CreateUserState,
  formData: FormData,
): Promise<CreateUserState> {
  return withTeamAdminContext<CreateUserState>(
    "team_create_context_failed",
    () => ({
      error: "We couldn't confirm teammate creation. Refresh the team list before trying again.",
      uncertain: true,
    }),
    async ({ auth, db, h, me }) => {
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
    async ({ auth, db, h, me }) => {
      if (me?.role !== "admin") return { error: "Not authorized." };
      const parsed = roleSchema.safeParse(Object.fromEntries(formData));
      if (!parsed.success) return { error: "Invalid request." };
      // Don't let an admin demote themselves and risk locking everyone out.
      if (parsed.data.userId === me.id && parsed.data.role !== "admin")
        return { error: "You can't remove your own admin access." };
      const target = await staffTarget(db, parsed.data.userId);
      if (!target) return { error: "Teammate not found." };
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
      const updated = plan.banned
        ? await auth.api.banUser({ body: { userId: parsed.data.userId }, headers: h })
        : await auth.api.unbanUser({ body: { userId: parsed.data.userId }, headers: h });
      observedBanned = updated.user.banned === true;
      if (observedBanned !== plan.banned) {
        throw new Error("Access update returned an unexpected state");
      }
      await db.insert(schema.auditLog).values({
        actorId: me.id,
        actorEmail: me.email,
        action: plan.auditAction,
        entityType: "user",
        entityId: target.id,
        before: { banned: currentlyBanned },
        after: { banned: observedBanned },
      });
      revalidatePath("/team");
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
      // Authored records have restrictive FKs, while partner review rows require
      // verified_by to remain present. Refuse deletion rather than break history.
      const [notes, cases, partnerReviews] = await Promise.all([
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
      ]);
      const refusal = staffDeletionRefusal({
        notes: notes.length > 0,
        cases: cases.length > 0,
        partnerReviews: partnerReviews.length > 0,
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
