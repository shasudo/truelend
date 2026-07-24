export function requireLegacyBusinessCleanupApproval(approved?: string): void {
  if (approved !== "true") {
    throw new Error("Legacy Business Partner cleanup requires explicit protected-release approval");
  }
}
