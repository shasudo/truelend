export interface HealthResponse {
  status: "ok" | "error";
  service: string;
  timestamp: string;
  db?: "ok" | "error";
  turnstile?: "ok" | "error";
  auth?: "ok" | "error";
}
