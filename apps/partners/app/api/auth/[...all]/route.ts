import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDb } from "@truelend/db";
import {
  allowSensitiveAuthRequest,
  createPartnerAuth,
  isPartnerAuthEndpointAllowed,
} from "@truelend/auth";
import { authOptions } from "@/lib/auth";

// Per-request auth instance; signup enabled (partners self-register). Shared
// authOptions also wires the reset-password email sender.
async function handler(req: Request) {
  const { env, ctx } = getCloudflareContext();
  if (!isPartnerAuthEndpointAllowed(req)) {
    return Response.json({ code: "not_found", error: "Not found." }, { status: 404 });
  }
  if (!(await allowSensitiveAuthRequest(req, env.AUTH_RATE_LIMITER))) {
    return Response.json(
      { error: "Too many attempts. Please wait a minute and try again." },
      { status: 429, headers: { "retry-after": "60" } },
    );
  }
  const db = createDb(env.HYPERDRIVE.connectionString);
  const auth = createPartnerAuth(db, authOptions(env));
  try {
    return await auth.handler(req);
  } finally {
    ctx.waitUntil(db.$client.end());
  }
}

export { handler as GET, handler as POST };
