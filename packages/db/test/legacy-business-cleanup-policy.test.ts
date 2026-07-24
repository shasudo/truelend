import assert from "node:assert/strict";
import test from "node:test";
import { requireLegacyBusinessCleanupApproval } from "../scripts/legacy-business-cleanup-policy";

void test("cleanup requires a dedicated approval flag", () => {
  assert.throws(
    () => requireLegacyBusinessCleanupApproval(),
    /explicit protected-release approval/,
  );
  assert.throws(
    () => requireLegacyBusinessCleanupApproval("false"),
    /explicit protected-release approval/,
  );
});

void test("cleanup accepts only the explicit protected-release approval", () => {
  assert.doesNotThrow(() => requireLegacyBusinessCleanupApproval("true"));
});
