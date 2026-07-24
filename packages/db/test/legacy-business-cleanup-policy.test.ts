import assert from "node:assert/strict";
import test from "node:test";
import {
  requireLegacyBusinessCleanupApproval,
  shouldDeleteLegacyBusinessUsers,
} from "../scripts/legacy-business-cleanup-policy";

void test("cleanup requires a dedicated approval flag", () => {
  assert.throws(
    () => requireLegacyBusinessCleanupApproval({ expectedUsers: "2" }),
    /explicit protected-release approval/,
  );
});

void test("cleanup requires a positive expected user count", () => {
  for (const expectedUsers of [undefined, "", "0", "-1", "2.5", "two"]) {
    assert.throws(
      () => requireLegacyBusinessCleanupApproval({ approved: "true", expectedUsers }),
      /positive integer/,
    );
  }
});

void test("cleanup accepts an explicitly approved expected user count", () => {
  assert.equal(requireLegacyBusinessCleanupApproval({ approved: "true", expectedUsers: "2" }), 2);
});

void test("cleanup is idempotent after all legacy users are gone", () => {
  assert.equal(shouldDeleteLegacyBusinessUsers(0, 2), false);
});

void test("cleanup proceeds only when the actual count matches", () => {
  assert.equal(shouldDeleteLegacyBusinessUsers(2, 2), true);
  assert.throws(() => shouldDeleteLegacyBusinessUsers(1, 2), /no rows were deleted/);
  assert.throws(() => shouldDeleteLegacyBusinessUsers(3, 2), /no rows were deleted/);
});
