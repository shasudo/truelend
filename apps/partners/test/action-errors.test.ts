import assert from "node:assert/strict";
import test from "node:test";
import { reportPartnerActionFailure } from "../lib/action-errors";

void test("reportPartnerActionFailure: logs the event and error name, never the error message", (t) => {
  const logs: unknown[] = [];
  t.mock.method(console, "error", (message: unknown) => {
    logs.push(message);
  });

  reportPartnerActionFailure("thing_failed", new TypeError("sensitive detail"));
  reportPartnerActionFailure("thing_failed", "a plain string, not an Error");

  assert.deepEqual(JSON.parse(logs[0] as string), {
    event: "thing_failed",
    errorType: "TypeError",
  });
  assert.deepEqual(JSON.parse(logs[1] as string), { event: "thing_failed", errorType: "unknown" });
  assert.ok(!(logs[0] as string).includes("sensitive detail"));
});
