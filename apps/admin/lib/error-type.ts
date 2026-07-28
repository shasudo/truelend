export function errorType(error: unknown): string {
  return error instanceof Error ? error.name : "unknown";
}
