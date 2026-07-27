interface WebsiteExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

/**
 * Runs best-effort Worker background work without allowing task creation,
 * rejection, or scheduling failures to replace an already-determined response.
 */
export function scheduleWebsiteBackgroundTask(
  ctx: WebsiteExecutionContext,
  event: string,
  createTask: () => Promise<unknown>,
): void {
  let task: Promise<unknown>;
  try {
    task = createTask();
  } catch (error) {
    console.error(
      JSON.stringify({
        event,
        stage: "create",
        errorType: error instanceof Error ? error.name : "unknown",
      }),
    );
    return;
  }

  const reportedTask = task.catch((error: unknown) => {
    console.error(
      JSON.stringify({
        event,
        stage: "run",
        errorType: error instanceof Error ? error.name : "unknown",
      }),
    );
  });
  try {
    ctx.waitUntil(reportedTask);
  } catch (error) {
    console.error(
      JSON.stringify({
        event,
        stage: "schedule",
        errorType: error instanceof Error ? error.name : "unknown",
      }),
    );
  }
}
