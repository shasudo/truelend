import { healthHeaders } from "@truelend/health";
import type { HealthResponse } from "@truelend/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const body: HealthResponse = {
    status: "ok",
    service: "website",
    timestamp: new Date().toISOString(),
  };
  return Response.json(body, { headers: healthHeaders() });
}
