export function reportPartnerActionFailure(event: string, error: unknown): void {
  console.error(
    JSON.stringify({
      event,
      errorType: error instanceof Error ? error.name : "unknown",
    }),
  );
}
