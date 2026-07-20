import { healthHeaders, type HealthResponse } from "@truelend/health";

export const dynamic = "force-dynamic";

export function GET() {
  const body: HealthResponse = {
    status: "ok",
    service: "partners",
    timestamp: new Date().toISOString(),
  };
  return Response.json(body, { headers: healthHeaders() });
}
