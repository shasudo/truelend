import assert from "node:assert/strict";
import test from "node:test";
import {
  schedulePartnerBackgroundTask,
  withOwnedRequestContext,
} from "../lib/owned-request-context";

interface TestOwnedContext {
  db: { $client: { end(): Promise<void> } };
  ctx: { waitUntil(promise: Promise<unknown>): void };
}

function harness() {
  let creates = 0;
  let ends = 0;
  const scheduled: Promise<unknown>[] = [];
  const contexts: TestOwnedContext[] = [];
  const create = (): TestOwnedContext => {
    creates += 1;
    const context = {
      db: {
        $client: {
          end: async () => {
            ends += 1;
          },
        },
      },
      ctx: {
        waitUntil: (promise: Promise<unknown>) => {
          scheduled.push(promise);
        },
      },
    };
    contexts.push(context);
    return context;
  };
  return {
    create,
    contexts,
    counts: () => ({ creates, ends, scheduled: scheduled.length }),
    settle: () => Promise.all(scheduled),
  };
}

void test("an owned request creates and closes exactly one client on success", async () => {
  const owner = harness();
  let callbackContext: ReturnType<typeof owner.create> | undefined;
  const result = await withOwnedRequestContext(owner.create, async (context) => {
    callbackContext = context;
    return "ok";
  });
  await owner.settle();

  assert.equal(result, "ok");
  assert.equal(owner.contexts.length, 1);
  assert.strictEqual(callbackContext, owner.contexts[0]);
  assert.deepEqual(owner.counts(), { creates: 1, ends: 1, scheduled: 1 });
});

void test("an owned request closes exactly one client when the operation fails", async () => {
  const owner = harness();
  await assert.rejects(
    withOwnedRequestContext(owner.create, async () => {
      throw new Error("database unavailable");
    }),
    /database unavailable/,
  );
  await owner.settle();

  assert.deepEqual(owner.counts(), { creates: 1, ends: 1, scheduled: 1 });
});

void test("a synchronous cleanup failure cannot replace a successful result", async () => {
  const result = await withOwnedRequestContext(
    () => ({
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
    async () => "saved",
  );

  assert.equal(result, "saved");
});

void test("a cleanup scheduling failure cannot replace a successful result", async () => {
  let ended = false;
  const result = await withOwnedRequestContext(
    () => ({
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
    async () => "saved",
  );

  assert.equal(result, "saved");
  assert.equal(ended, true);
});

void test("a rejected partner background task is handled", async () => {
  const scheduled: Promise<unknown>[] = [];

  assert.doesNotThrow(() =>
    schedulePartnerBackgroundTask(
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

void test("partner background task creation and scheduling failures do not escape", () => {
  assert.doesNotThrow(() =>
    schedulePartnerBackgroundTask(
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
    schedulePartnerBackgroundTask(
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
