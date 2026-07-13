import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDb } from "@truelend/db";
import { createAuth } from "@truelend/auth";
import { authOptions } from "@/lib/auth";

// Per-request auth instance (workerd forbids cross-request I/O reuse); this
// handler owns its connection and closes it after the response. Uses the shared
// authOptions so the reset-password email sender is wired here too.
async function handler(req: Request) {
  const { env, ctx } = getCloudflareContext();
  const db = createDb(env.HYPERDRIVE.connectionString);
  const auth = createAuth(db, authOptions(env));
  try {
    return await auth.handler(req);
  } finally {
    ctx.waitUntil(db.$client.end());
  }
}

export { handler as GET, handler as POST };
