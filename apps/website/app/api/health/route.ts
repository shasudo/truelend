import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDb, ping } from "@truelend/db";
import type { HealthResponse } from "@truelend/types";

// Touches the database, so it can't be statically rendered.
export const dynamic = "force-dynamic";

export async function GET() {
  const { env, ctx } = getCloudflareContext();

  let db: HealthResponse["db"] = "error";
  let conn: ReturnType<typeof createDb> | null = null;
  try {
    conn = createDb(env.HYPERDRIVE.connectionString);
    await ping(conn);
    db = "ok";
  } catch {
    db = "error";
  } finally {
    if (conn) ctx.waitUntil(conn.$client.end());
  }

  const turnstile =
    env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? "ok" : "error";
  const status = db === "ok" && turnstile === "ok" ? "ok" : "error";

  const body: HealthResponse = {
    status,
    service: "website",
    timestamp: new Date().toISOString(),
    db,
    turnstile,
  };
  // A missing CAPTCHA key pair is a production incident, not a healthy lead path.
  return Response.json(body, { status: status === "ok" ? 200 : 503 });
}
