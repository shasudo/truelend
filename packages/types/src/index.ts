export interface HealthResponse {
  // "error" when a hard dependency (the DB) is down; the route also returns
  // HTTP 503 in that case so uptime checks fail instead of reading a 200.
  status: "ok" | "error";
  service: string;
  timestamp: string;
  db: "ok" | "error";
  turnstile: "ok" | "error";
}
