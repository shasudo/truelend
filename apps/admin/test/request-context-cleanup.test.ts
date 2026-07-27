import assert from "node:assert/strict";
import test from "node:test";
import {
  scheduleAdminBackgroundTask,
  scheduleAdminRequestContextCleanup,
} from "../lib/request-context-cleanup";

void test("admin request cleanup closes and schedules one owned client", async () => {
  let ends = 0;
  const scheduled: Promise<unknown>[] = [];

  scheduleAdminRequestContextCleanup({
    db: {
      $client: {
        end: async () => {
          ends += 1;
        },
      },
    },
    ctx: {
      waitUntil: (promise) => {
        scheduled.push(promise);
      },
    },
  });
  await Promise.all(scheduled);

  assert.equal(ends, 1);
  assert.equal(scheduled.length, 1);
});

void test("a synchronous admin cleanup failure does not escape", () => {
  assert.doesNotThrow(() =>
    scheduleAdminRequestContextCleanup({
      db: {
        $client: {
          end: () => {
            throw new Error("cleanup failed");
          },
        },
      },
      ctx: {
        waitUntil: () => {
          throw new Error("cleanup must not be scheduled");
        },
      },
    }),
  );
});

void test("an asynchronous admin cleanup failure is handled", async () => {
  const scheduled: Promise<unknown>[] = [];

  assert.doesNotThrow(() =>
    scheduleAdminRequestContextCleanup({
      db: {
        $client: {
          end: () => Promise.reject(new Error("cleanup failed")),
        },
      },
      ctx: {
        waitUntil: (promise) => {
          scheduled.push(promise);
        },
      },
    }),
  );
  await assert.doesNotReject(Promise.all(scheduled));
});

void test("an admin cleanup scheduling failure does not escape", async () => {
  let ended = false;

  assert.doesNotThrow(() =>
    scheduleAdminRequestContextCleanup({
      db: {
        $client: {
          end: async () => {
            ended = true;
          },
        },
      },
      ctx: {
        waitUntil: () => {
          throw new Error("scheduling failed");
        },
      },
    }),
  );
  await Promise.resolve();

  assert.equal(ended, true);
});

void test("admin background work cannot replace a committed action result", async () => {
  const scheduled: Promise<unknown>[] = [];

  assert.doesNotThrow(() =>
    scheduleAdminBackgroundTask(
      {
        waitUntil: (promise) => {
          scheduled.push(promise);
        },
      },
      "test_background_failure",
      () => Promise.reject(new Error("delivery failed")),
    ),
  );
  await assert.doesNotReject(Promise.all(scheduled));
});

void test("admin background task construction and scheduling failures do not escape", async () => {
  assert.doesNotThrow(() =>
    scheduleAdminBackgroundTask(
      {
        waitUntil: () => {
          throw new Error("must not schedule");
        },
      },
      "test_background_start_failure",
      () => {
        throw new Error("start failed");
      },
    ),
  );

  let ran = false;
  assert.doesNotThrow(() =>
    scheduleAdminBackgroundTask(
      {
        waitUntil: () => {
          throw new Error("schedule failed");
        },
      },
      "test_background_schedule_failure",
      async () => {
        ran = true;
      },
    ),
  );
  await Promise.resolve();
  assert.equal(ran, true);
});
