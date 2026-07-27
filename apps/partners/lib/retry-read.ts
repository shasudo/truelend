/**
 * Retries a read once when a transient Worker or database failure occurs. Writes
 * are deliberately excluded so a request can never duplicate a state change.
 */
export async function retryRead<T>(event: string, read: () => Promise<T>): Promise<T> {
  try {
    return await read();
  } catch (error) {
    console.warn(
      JSON.stringify({
        event,
        errorType: error instanceof Error ? error.name : "unknown",
      }),
    );
    return read();
  }
}
