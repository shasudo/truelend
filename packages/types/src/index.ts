// Shared contract for the app's API responses.
// Type-only package (no runtime code) — consumed via `import type`.
// Need shared runtime logic (money math, validators)? Add a compiled
// `@truelend/core` package rather than putting values here.

export interface HealthResponse {
  // "error" when a hard dependency (the DB) is down; the route also returns
  // HTTP 503 in that case so uptime checks fail instead of reading a 200.
  status: "ok" | "error";
  service: string;
  timestamp: string;
  db: "ok" | "error";
  turnstile: "ok" | "error";
}
