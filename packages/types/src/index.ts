// Shared contract for the app's API responses.
// Type-only package (no runtime code) — consumed via `import type`.
// Need shared runtime logic (money math, validators)? Add a compiled
// `@truelend/core` package rather than putting values here.

export interface HealthResponse {
  status: "ok";
  service: string;
  timestamp: string;
  db: "ok" | "error";
}
