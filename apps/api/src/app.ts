import { Hono } from "hono";
import type { HealthResponse } from "@truelend/types";

// App separated from the server (index.ts) so tests can call app.request()
// without binding a port.
export const app = new Hono();

app.get("/health", (c) => {
  const body: HealthResponse = {
    status: "ok",
    service: "api",
    timestamp: new Date().toISOString(),
  };
  return c.json(body);
});
