function isMissingFile(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

export function loadLocalDatabaseEnv(path = ".env"): void {
  try {
    process.loadEnvFile(path);
  } catch (error) {
    if (isMissingFile(error)) return;
    throw error;
  }
}
