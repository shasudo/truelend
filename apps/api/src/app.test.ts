import { describe, expect, it } from "vitest";
import type { HealthResponse } from "@truelend/types";
import { app } from "./app.js";

describe("GET /health", () => {
  it("returns a well-formed HealthResponse", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);

    const body = (await res.json()) as HealthResponse;
    expect(body.status).toBe("ok");
    expect(body.service).toBe("api");
    expect(typeof body.timestamp).toBe("string");
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
  });
});
