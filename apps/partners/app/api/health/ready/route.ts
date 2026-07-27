import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDb, ping, pingPartnerRegistrationSchema } from "@truelend/db";
import {
  hasConfiguredValues,
  healthHeaders,
  isReadinessAuthorized,
  type HealthResponse,
} from "@truelend/health";
import { scheduleOwnedRequestContextCleanup } from "@/lib/owned-request-context";

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
  let registration: "ok" | "error" = "error";
  try {
    await ping(connection);
    db = "ok";
  } catch {
    db = "error";
  }
  try {
    await pingPartnerRegistrationSchema(connection);
    registration = "ok";
  } catch {
    registration = "error";
  } finally {
    scheduleOwnedRequestContextCleanup({ db: connection, ctx });
  }
  const auth = hasConfiguredValues(env.BETTER_AUTH_SECRET, env.BETTER_AUTH_URL) ? "ok" : "error";
  const turnstile = hasConfiguredValues(env.TURNSTILE_SECRET_KEY, env.TURNSTILE_SITE_KEY)
    ? "ok"
    : "error";
  const status =
    db === "ok" && registration === "ok" && auth === "ok" && turnstile === "ok" ? "ok" : "error";
  const body: HealthResponse = {
    status,
    service: "partners",
    timestamp: new Date().toISOString(),
    db,
    registration,
    auth,
    turnstile,
  };
  return Response.json(body, {
    status: status === "ok" ? 200 : 503,
    headers: healthHeaders(),
  });
}
