import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDb, ping } from "@truelend/db";
import { healthHeaders, isReadinessAuthorized, type HealthResponse } from "@truelend/health";
import { scheduleWebsiteBackgroundTask } from "@/lib/background-task";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { env, ctx } = getCloudflareContext();
  if (!(await isReadinessAuthorized(request, env.HEALTHCHECK_SECRET))) {
    return Response.json(
      { status: "error" },
      { status: env.HEALTHCHECK_SECRET ? 401 : 503, headers: healthHeaders() },
    );
  }

  let db: "ok" | "error" = "error";
  const connection = createDb(env.HYPERDRIVE.connectionString);
  try {
    await ping(connection);
    db = "ok";
  } catch {
    db = "error";
  } finally {
    scheduleWebsiteBackgroundTask(ctx, "website_readiness_context_cleanup_failed", () =>
      connection.$client.end(),
    );
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
  return Response.json(body, {
    status: status === "ok" ? 200 : 503,
    headers: healthHeaders(),
  });
}
