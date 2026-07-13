import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDb, ping } from "@truelend/db";
import type { HealthResponse } from "@truelend/types";

// Touches the database, so it can't be statically rendered.
export const dynamic = "force-dynamic";

export async function GET() {
  const { env, ctx } = getCloudflareContext();

  let db: HealthResponse["db"] = "error";
  try {
    const conn = createDb(env.HYPERDRIVE.connectionString);
    await ping(conn);
    ctx.waitUntil(conn.$client.end());
    db = "ok";
  } catch {
    db = "error";
  }

  const body: HealthResponse = {
    status: db === "ok" ? "ok" : "error",
    service: "website",
    timestamp: new Date().toISOString(),
    db,
  };
  // 503 when the DB is down so uptime checks/load balancers see the failure
  // rather than a misleading 200.
  return Response.json(body, { status: db === "ok" ? 200 : 503 });
}
