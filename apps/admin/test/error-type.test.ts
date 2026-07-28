import assert from "node:assert/strict";
import test from "node:test";
import { errorType } from "../lib/error-type";

void test("errorType: extracts the Error's name, and redacts everything else to 'unknown'", () => {
  assert.equal(errorType(new TypeError("sensitive detail")), "TypeError");
  assert.equal(errorType("a plain string, not an Error"), "unknown");
  assert.ok(!errorType(new Error("sensitive detail")).includes("sensitive detail"));
});
