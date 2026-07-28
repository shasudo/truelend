import { errorType } from "./error-type";

interface AdminRequestContext {
  db: { $client: { end(): Promise<unknown> } };
  ctx: { waitUntil(promise: Promise<unknown>): void };
}

interface AdminExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

/**
 * Starts and schedules best-effort work without allowing task construction,
 * rejection, or waitUntil scheduling to replace a committed action result.
 */
export function scheduleAdminBackgroundTask(
  ctx: AdminExecutionContext,
  event: string,
  task: () => Promise<unknown>,
): void {
  let pending: Promise<unknown>;
  try {
    pending = task();
  } catch (error) {
    console.error(JSON.stringify({ event, phase: "start", errorType: errorType(error) }));
    return;
  }

  const reported = pending.catch((error: unknown) => {
    console.error(JSON.stringify({ event, phase: "run", errorType: errorType(error) }));
  });
  try {
    ctx.waitUntil(reported);
  } catch (error) {
    console.error(JSON.stringify({ event, phase: "schedule", errorType: errorType(error) }));
  }
}

/**
 * Schedules request-owned database cleanup without allowing a cleanup failure
 * to replace an action or route's already-determined response.
 */
export function scheduleAdminRequestContextCleanup(context: AdminRequestContext): void {
  let cleanup: Promise<unknown>;
  try {
    cleanup = context.db.$client.end();
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "admin_request_context_cleanup_failed",
        errorType: errorType(error),
      }),
    );
    return;
  }

  const reportedCleanup = cleanup.catch((error: unknown) => {
    console.error(
      JSON.stringify({
        event: "admin_request_context_cleanup_failed",
        errorType: errorType(error),
      }),
    );
  });
  try {
    context.ctx.waitUntil(reportedCleanup);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "admin_request_context_cleanup_schedule_failed",
        errorType: errorType(error),
      }),
    );
  }
}
