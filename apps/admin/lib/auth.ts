import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ExecutionContext } from "@cloudflare/workers-types";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDb, type Database } from "@truelend/db";
import {
  createAdminAuth,
  type AdminAuth,
  type AdminSession,
  type CreateAuthOptions,
} from "@truelend/auth/server";
import { sendPasswordReset } from "@truelend/email";
import { scheduleAdminRequestContextCleanup } from "./request-context-cleanup";

export function authOptions(env: CloudflareEnv): CreateAuthOptions {
  return {
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    sendResetPassword: async ({ user, url }) => {
      const result = await sendPasswordReset(env, { to: user.email, name: user.name, url });
      if (result.ok && !result.skipped) return;
      // Email was skipped because no provider is configured (local dev). Surface
      // the reset/activation link on the server console so staff creation and
      // resets are testable without email. In production a skip is a real
      // failure and must fail closed — never mint a staff
      // account that can't be activated.
      if (result.ok && result.skipped && new URL(env.BETTER_AUTH_URL).hostname === "localhost") {
        console.warn(`[dev] password reset link for ${user.email}: ${url}`);
        return;
      }
      throw new Error("Password reset email was not accepted for delivery");
    },
  };
}

interface AuthContext {
  db: Database;
  auth: AdminAuth;
  ctx: ExecutionContext;
  env: CloudflareEnv;
}

/*
 * Server actions and route handlers call this factory directly so each
 * mutation/request owns exactly one fresh client and can close it.
 */
export function createAuthContext(): AuthContext {
  const { env, ctx } = getCloudflareContext();
  const db = createDb(env.HYPERDRIVE.connectionString);
  try {
    const auth = createAdminAuth(db, authOptions(env));
    return { db, auth, ctx, env };
  } catch (error) {
    scheduleAdminRequestContextCleanup({ db, ctx });
    throw error;
  }
}

/*
 * RSC reads share one db + auth across layout/pages via React.cache. They don't
 * close the client because layout and page share it and there is no single safe
 * owner.
 * ponytail: RSC reads skip end(); Hyperdrive reclaims idle connections.
 * Revisit if connection utilization exceeds 80% or readiness detects exhaustion.
 */
export const getAuthContext = cache(createAuthContext);

/*
 * Staff = the two internal roles. This is the load-bearing boundary: partners
 * share these auth tables and can authenticate here (they self-register in the
 * partner app), so "a valid session exists" is NOT staff. A partner session
 * must never reach admin data or mutations — gate on role, not on presence.
 */
const STAFF_ROLES = new Set(["admin", "employee"]);
function isStaff(role: string | null | undefined): boolean {
  return role != null && STAFF_ROLES.has(role);
}

async function requireSession(): Promise<AdminSession> {
  const { auth } = getAuthContext();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return session;
}

/**
 * Page/layout guard for all internal staff. Non-staff (partners, or a raw-signup
 * account) are bounced to /login — the login page never auto-forwards, so this
 * is a hard denial, not a loop.
 * ponytail: bounce-to-login leaves the partner's admin-domain session live but
 * useless. Clear it on rejection if support records this half-signed-in state.
 */
export async function requireStaff(): Promise<AdminSession> {
  const session = await requireSession();
  if (!isStaff(session.user.role)) redirect("/login");
  return session;
}

export async function requireAdmin(): Promise<AdminSession> {
  const session = await requireSession();
  if (session.user.role !== "admin") redirect("/");
  return session;
}

interface MutationContext {
  db: Database;
  ctx: ExecutionContext;
  env: CloudflareEnv;
  user: AdminSession["user"] | null;
}

/**
 * For server actions: db + ctx + the current STAFF user (null otherwise).
 * Server actions never run the layout, so this is the boundary for writes —
 * a non-staff session is surfaced as `user: null` so callers deny it exactly
 * like an expired session (`if (!user) redirect("/login")`).
 * The action owns this connection and must close it via ctx.waitUntil.
 */
export async function getMutationContext(): Promise<MutationContext> {
  const { db, auth, ctx, env } = createAuthContext();
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const user = session?.user ?? null;
    return { db, ctx, env, user: isStaff(user?.role) ? user : null };
  } catch (error) {
    scheduleAdminRequestContextCleanup({ db, ctx });
    throw error;
  }
}
