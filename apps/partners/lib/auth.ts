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
} from "@truelend/auth/server";
import { sendPasswordReset } from "@truelend/email";
import {
  scheduleOwnedRequestContextCleanup,
  withOwnedRequestContext,
} from "./owned-request-context";
import { retryRead } from "./retry-read";

export function authOptions(env: CloudflareEnv): CreateAuthOptions {
  return {
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    allowSignUp: true,
    sendResetPassword: async ({ user, url }) => {
      const result = await sendPasswordReset(env, { to: user.email, name: user.name, url });
      if (result.ok && !result.skipped) return;
      // No email provider configured (local dev): log the reset link so the flow
      // is testable. In production a skip is a real failure and must fail closed.
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
  auth: PartnerAuth;
  ctx: ExecutionContext;
  env: CloudflareEnv;
}

interface PartnerRequestContext extends AuthContext {
  session: PartnerSession | null;
  partner: Partner | null;
}

function createAuthContext(): AuthContext {
  const { env, ctx } = getCloudflareContext();
  const db = createDb(env.HYPERDRIVE.connectionString);
  try {
    const auth = createPartnerAuth(db, authOptions(env));
    return { db, auth, ctx, env };
  } catch (error) {
    scheduleOwnedRequestContextCleanup({ db, ctx });
    throw error;
  }
}

export function createPartnerActionContext(): AuthContext {
  return createAuthContext();
}

// One db + auth per request, React.cache-shared across layout and pages. RSC
// reads have no single connection owner; actions and routes close clients with
// ctx.waitUntil.
// ponytail: Hyperdrive reclaims the cached RSC client's idle session. Revisit if
// connection utilization exceeds 80% or readiness detects exhaustion.
export const getAuthContext = cache(createAuthContext);

export const getOptionalPartnerSession = cache(async (): Promise<PartnerSession | null> => {
  const { auth } = getAuthContext();
  return retryRead("partner_session_read_retry", async () =>
    auth.api.getSession({ headers: await headers() }),
  );
});

interface PartnerSessionContext {
  session: PartnerSession;
  partner: Partner | null;
}

export const requirePartnerSession = cache(async (): Promise<PartnerSessionContext> => {
  const { db } = getAuthContext();
  const session = await getOptionalPartnerSession();
  if (!session) redirect("/login");
  const rows = await retryRead("partner_profile_read_retry", () =>
    db.select().from(schema.partners).where(eq(schema.partners.userId, session.user.id)).limit(1),
  );
  return { session, partner: rows[0] ?? null };
});

export async function requirePartner(): Promise<{ session: PartnerSession; partner: Partner }> {
  const context = await requirePartnerSession();
  if (!context.partner) redirect("/register/referral");
  return { session: context.session, partner: context.partner };
}

/**
 * Runs one Server Action or Route Handler with one explicitly owned database
 * client. React.cache only memoizes while rendering Server Components, so action
 * and route code must pass this context through instead of nesting the cached
 * RSC helpers above.
 */
export async function withPartnerRequest<T>(
  requestHeaders: Headers,
  run: (context: PartnerRequestContext) => Promise<T>,
): Promise<T> {
  return withOwnedRequestContext(createAuthContext, async (context) => {
    const session = await retryRead("partner_action_session_read_retry", () =>
      context.auth.api.getSession({ headers: requestHeaders }),
    );
    const partner = session
      ? ((
          await retryRead("partner_action_profile_read_retry", () =>
            context.db
              .select()
              .from(schema.partners)
              .where(eq(schema.partners.userId, session.user.id))
              .limit(1),
          )
        )[0] ?? null)
      : null;
    return await run({ ...context, session, partner });
  });
}

export async function withPartnerMutation<T>(
  run: (context: PartnerRequestContext) => Promise<T>,
): Promise<T> {
  return withPartnerRequest(await headers(), run);
}
