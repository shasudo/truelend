import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDb } from "@truelend/db";
import { createAuth } from "@truelend/auth";
import { authOptions } from "@/lib/auth";

// Per-request auth instance; signup enabled (partners self-register). Shared
// authOptions also wires the reset-password email sender.
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
