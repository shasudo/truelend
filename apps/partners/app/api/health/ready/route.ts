import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDb, ping } from "@truelend/db";
import { healthHeaders, isReadinessAuthorized } from "@truelend/health";
import type { HealthResponse } from "@truelend/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { env, ctx } = getCloudflareContext();
  if (!(await isReadinessAuthorized(request, env.HEALTHCHECK_SECRET))) {
    return Response.json(
      { status: "error" },
      { status: env.HEALTHCHECK_SECRET ? 401 : 503, headers: healthHeaders() },
    );
  }
  const connection = createDb(env.HYPERDRIVE.connectionString);
  let db: "ok" | "error" = "error";
  try {
    await ping(connection);
    db = "ok";
  } catch {
    db = "error";
  } finally {
    ctx.waitUntil(connection.$client.end());
  }
  const auth = env.BETTER_AUTH_SECRET && env.BETTER_AUTH_URL ? "ok" : "error";
  const turnstile =
    env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? "ok" : "error";
  const status = db === "ok" && auth === "ok" && turnstile === "ok" ? "ok" : "error";
  const body: HealthResponse = {
    status,
    service: "partners",
    timestamp: new Date().toISOString(),
    db,
    auth,
    turnstile,
  };
  return Response.json(body, {
    status: status === "ok" ? 200 : 503,
    headers: healthHeaders(),
  });
}
