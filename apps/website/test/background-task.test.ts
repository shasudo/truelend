import assert from "node:assert/strict";
import test from "node:test";
import { scheduleWebsiteBackgroundTask } from "../lib/background-task";

void test("website background task failures are handled", async () => {
  const scheduled: Promise<unknown>[] = [];

  assert.doesNotThrow(() =>
    scheduleWebsiteBackgroundTask(
      {
        waitUntil: (promise) => {
          scheduled.push(promise);
        },
      },
      "test_background_task_failed",
      () => Promise.reject(new Error("task failed")),
    ),
  );
  await assert.doesNotReject(Promise.all(scheduled));
});

void test("website background task creation and scheduling failures do not escape", () => {
  assert.doesNotThrow(() =>
    scheduleWebsiteBackgroundTask(
      {
        waitUntil: () => {
          throw new Error("scheduling failed");
        },
      },
      "test_background_task_failed",
      async () => undefined,
    ),
  );

  assert.doesNotThrow(() =>
    scheduleWebsiteBackgroundTask(
      {
        waitUntil: () => {
          throw new Error("must not schedule");
        },
      },
      "test_background_task_failed",
      () => {
        throw new Error("creation failed");
      },
    ),
  );
});
