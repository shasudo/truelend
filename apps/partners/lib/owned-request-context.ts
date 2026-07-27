interface OwnedRequestContext {
  db: { $client: { end(): Promise<unknown> } };
  ctx: { waitUntil(promise: Promise<unknown>): void };
}

interface PartnerExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

/**
 * Starts bounded background work without allowing task creation, rejection, or
 * scheduling failures to replace an already-committed action response.
 */
export function schedulePartnerBackgroundTask(
  ctx: PartnerExecutionContext,
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

/**
 * Schedules cleanup without allowing a cleanup/scheduling failure to replace
 * the action's already-determined result.
 */
export function scheduleOwnedRequestContextCleanup(context: OwnedRequestContext): void {
  let cleanup: Promise<unknown>;
  try {
    cleanup = context.db.$client.end();
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "partner_request_context_cleanup_failed",
        errorType: error instanceof Error ? error.name : "unknown",
      }),
    );
    return;
  }

  const reportedCleanup = cleanup.catch((error: unknown) => {
    console.error(
      JSON.stringify({
        event: "partner_request_context_cleanup_failed",
        errorType: error instanceof Error ? error.name : "unknown",
      }),
    );
  });
  try {
    context.ctx.waitUntil(reportedCleanup);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "partner_request_context_cleanup_schedule_failed",
        errorType: error instanceof Error ? error.name : "unknown",
      }),
    );
  }
}

/**
 * Gives one action or route exclusive ownership of one request-scoped client.
 * The caller passes the same context through every nested helper, and cleanup is
 * scheduled exactly once on every return or throw path.
 */
export async function withOwnedRequestContext<TContext extends OwnedRequestContext, TResult>(
  create: () => TContext,
  run: (context: TContext) => Promise<TResult>,
): Promise<TResult> {
  const context = create();
  try {
    return await run(context);
  } finally {
    scheduleOwnedRequestContextCleanup(context);
  }
}
