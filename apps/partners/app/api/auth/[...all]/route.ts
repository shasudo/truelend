import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDb } from "@truelend/db";
import { createAuth } from "@truelend/auth";

// Per-request auth instance; signup enabled (partners self-register).
async function handler(req: Request) {
  const { env, ctx } = getCloudflareContext();
  const db = createDb(env.HYPERDRIVE.connectionString);
  const auth = createAuth(db, {
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    allowSignUp: true,
  });
  try {
    return await auth.handler(req);
  } finally {
    ctx.waitUntil(db.$client.end());
  }
}

export { handler as GET, handler as POST };
