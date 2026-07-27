import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDb } from "@truelend/db";
import { allowSensitiveAuthRequest, createAdminAuth } from "@truelend/auth/server";
import { authOptions } from "@/lib/auth";
import { scheduleAdminRequestContextCleanup } from "@/lib/request-context-cleanup";

// Per-request auth instance (workerd forbids cross-request I/O reuse); this
// handler owns its connection and closes it after the response. Uses the shared
// authOptions so the reset-password email sender is wired here too.
async function handler(req: Request) {
  const { env, ctx } = getCloudflareContext();
  if (!(await allowSensitiveAuthRequest(req, env.AUTH_RATE_LIMITER))) {
    return Response.json(
      { error: "Too many attempts. Please wait a minute and try again." },
      { status: 429, headers: { "retry-after": "60" } },
    );
  }
  const db = createDb(env.HYPERDRIVE.connectionString);
  try {
    const auth = createAdminAuth(db, authOptions(env));
    return await auth.handler(req);
  } finally {
    scheduleAdminRequestContextCleanup({ db, ctx });
  }
}

export { handler as GET, handler as POST };
