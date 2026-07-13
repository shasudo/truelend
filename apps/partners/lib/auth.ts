import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ExecutionContext } from "@cloudflare/workers-types";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";
import { createDb, schema, type Database, type Partner } from "@truelend/db";
import {
  createPartnerAuth,
  type CreateAuthOptions,
  type PartnerAuth,
  type PartnerSession,
} from "@truelend/auth";
import { sendPasswordReset } from "@truelend/email";

export function authOptions(env: CloudflareEnv): CreateAuthOptions {
  return {
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    allowSignUp: true,
    sendResetPassword: async ({ user, url }) => {
      const result = await sendPasswordReset(env, { to: user.email, name: user.name, url });
      if (!result.ok || result.skipped) {
        throw new Error("Password reset email was not accepted for delivery");
      }
    },
  };
}

interface AuthContext {
  db: Database;
  auth: PartnerAuth;
  ctx: ExecutionContext;
  env: CloudflareEnv;
}

// One db + auth per request (React.cache-shared across layout/pages). Signup is
// enabled here — partners self-register. See apps/admin/lib/auth.ts for the
// connection-hygiene rationale (RSC reads don't close; actions/routes do).
export const getAuthContext = cache((): AuthContext => {
  const { env, ctx } = getCloudflareContext();
  const db = createDb(env.HYPERDRIVE.connectionString);
  const auth = createPartnerAuth(db, authOptions(env));
  return { db, auth, ctx, env };
});

export async function getSession(): Promise<PartnerSession | null> {
  const { auth } = getAuthContext();
  return auth.api.getSession({ headers: await headers() });
}

export interface PartnerContext {
  session: PartnerSession;
  partner: Partner | null;
}

export async function requirePartner(): Promise<PartnerContext> {
  const { db } = getAuthContext();
  const session = await getSession();
  if (!session) redirect("/login");
  const rows = await db
    .select()
    .from(schema.partners)
    .where(eq(schema.partners.userId, session.user.id))
    .limit(1);
  return { session, partner: rows[0] ?? null };
}

export async function getMutationContext() {
  const { db, ctx } = getAuthContext();
  try {
    const session = await getSession();
    return { db, ctx, user: session?.user ?? null };
  } catch (error) {
    ctx.waitUntil(db.$client.end());
    throw error;
  }
}

export async function requirePartnerApi(): Promise<
  { partner: Partner; db: Database; ctx: ExecutionContext; env: CloudflareEnv } | Response
> {
  const { db, ctx, env } = getAuthContext();
  try {
    const session = await getSession();
    if (!session) {
      ctx.waitUntil(db.$client.end());
      return new Response("Unauthorized", { status: 401 });
    }
    const rows = await db
      .select()
      .from(schema.partners)
      .where(eq(schema.partners.userId, session.user.id))
      .limit(1);
    const partner = rows[0];
    if (!partner) {
      ctx.waitUntil(db.$client.end());
      return new Response("No partner profile", { status: 403 });
    }
    return { partner, db, ctx, env };
  } catch (error) {
    ctx.waitUntil(db.$client.end());
    throw error;
  }
}
