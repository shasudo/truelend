interface LegacyBusinessCleanupEnvironment {
  approved?: string;
  expectedUsers?: string;
}

export function requireLegacyBusinessCleanupApproval({
  approved,
  expectedUsers,
}: LegacyBusinessCleanupEnvironment): number {
  if (approved !== "true") {
    throw new Error("Legacy Business Partner cleanup requires explicit protected-release approval");
  }

  const expected = Number(expectedUsers);
  if (!Number.isSafeInteger(expected) || expected <= 0) {
    throw new Error("Expected legacy Business Partner user count must be a positive integer");
  }

  return expected;
}

export function shouldDeleteLegacyBusinessUsers(actual: number, expected: number): boolean {
  if (!Number.isSafeInteger(actual) || actual < 0) {
    throw new Error("Actual legacy Business Partner user count must be a non-negative integer");
  }

  if (actual === 0) return false;
  if (actual !== expected) {
    throw new Error(
      `Legacy Business Partner cleanup expected ${expected} users but found ${actual}; no rows were deleted`,
    );
  }

  return true;
}
