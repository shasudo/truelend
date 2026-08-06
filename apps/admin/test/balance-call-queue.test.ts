import assert from "node:assert/strict";
import test from "node:test";
import type { CallStatus } from "@truelend/reference";
/*
 * Pure module with no mocked dependencies, so a static import is safe here.
 * These assert the RESULTING LOAD rather than an exact list of moves — the
 * property is "everyone ends up even without churning what they've worked",
 * not any particular way of getting there.
 */
import { balanceCallQueue, type BalanceMove, type BalanceTask } from "../lib/balance-call-queue";

function task(
  id: string,
  status: CallStatus = "new",
  assignedTo: string | null = null,
): BalanceTask {
  return { id, status, assignedTo };
}

/** The task list as it would be after the moves land. */
function applied(tasks: BalanceTask[], moves: BalanceMove[]): BalanceTask[] {
  const to = new Map(moves.map((move) => [move.taskId, move.to]));
  return tasks.map((t) => (to.has(t.id) ? { ...t, assignedTo: to.get(t.id)! } : t));
}

function loadsAfter(tasks: BalanceTask[], moves: BalanceMove[]): Map<string, number> {
  const loads = new Map<string, number>();
  for (const t of applied(tasks, moves)) {
    if (t.assignedTo === null) continue;
    loads.set(t.assignedTo, (loads.get(t.assignedTo) ?? 0) + 1);
  }
  return loads;
}

const sortedLoads = (tasks: BalanceTask[], moves: BalanceMove[]) =>
  [...loadsAfter(tasks, moves).values()].sort((a, b) => a - b);

const unassigned = (count: number, prefix = "u") =>
  Array.from({ length: count }, (_, i) => task(`${prefix}${i}`));

void test("no callers selected moves nothing, even with a full pool", () => {
  assert.deepEqual(balanceCallQueue(unassigned(10), []), []);
});

void test("an empty queue moves nothing", () => {
  assert.deepEqual(balanceCallQueue([], ["a", "b"]), []);
});

void test("an even pool splits evenly and every task comes from nobody", () => {
  const tasks = unassigned(6);
  const moves = balanceCallQueue(tasks, ["a", "b", "c"]);

  assert.equal(moves.length, 6);
  assert.deepEqual(sortedLoads(tasks, moves), [2, 2, 2]);
  assert.ok(
    moves.every((move) => move.from === null),
    "nothing was taken off anyone",
  );
});

void test("a remainder is spread, never dropped", () => {
  const tasks = unassigned(7);
  const moves = balanceCallQueue(tasks, ["a", "b", "c"]);

  assert.deepEqual(sortedLoads(tasks, moves), [2, 2, 3]);
  assert.equal(moves.length, 7, "every task was placed");
});

void test("the split does not depend on the order the callers were ticked", () => {
  const tasks = unassigned(7);
  const byTaskId = (a: BalanceMove, b: BalanceMove) => a.taskId.localeCompare(b.taskId);

  const one = balanceCallQueue(tasks, ["a", "b", "c"]).sort(byTaskId);
  const other = balanceCallQueue(tasks, ["c", "a", "b"]).sort(byTaskId);

  assert.deepEqual(one, other);
});

void test("fewer tasks than callers gives nobody a second task", () => {
  const tasks = unassigned(2);
  const moves = balanceCallQueue(tasks, ["a", "b", "c"]);

  assert.equal(moves.length, 2);
  assert.equal(Math.max(...loadsAfter(tasks, moves).values()), 1);
});

void test("a caller already at or under their share keeps everything", () => {
  const tasks = [task("t1", "new", "a"), task("t2", "new", "a"), ...unassigned(2)];
  const moves = balanceCallQueue(tasks, ["a", "b"]);

  assert.ok(
    moves.every((move) => move.from !== "a"),
    "an under-target caller was raided",
  );
  assert.deepEqual(sortedLoads(tasks, moves), [2, 2]);
});

void test("only the excess moves off an overloaded caller", () => {
  const tasks = [
    ...Array.from({ length: 5 }, (_, i) => task(`a${i}`, "new", "a")),
    task("b0", "new", "b"),
  ];
  const moves = balanceCallQueue(tasks, ["a", "b"]);

  assert.equal(moves.length, 2, "exactly the excess, not a full redeal");
  assert.ok(moves.every((move) => move.from === "a"));
  assert.deepEqual(sortedLoads(tasks, moves), [3, 3]);
});

void test("never-dialled tasks are shed before ones with rapport", () => {
  const tasks = [
    task("t-new-1", "new", "a"),
    task("t-attempted", "attempted", "a"),
    task("t-interested", "interested", "a"),
    task("t-new-2", "new", "a"),
  ];
  const moves = balanceCallQueue(tasks, ["a", "b"]);

  assert.deepEqual(
    moves.map((move) => move.taskId).sort(),
    ["t-new-1", "t-new-2"],
    "the worked tasks stayed with the caller who worked them",
  );
});

void test("a queue of nothing but scheduled callbacks never moves", () => {
  const tasks = Array.from({ length: 4 }, (_, i) => task(`c${i}`, "callback_scheduled", "a"));

  assert.deepEqual(balanceCallQueue(tasks, ["a", "b"]), []);
});

void test("a scheduled callback still counts as that caller's workload", () => {
  const tasks = [
    task("c0", "callback_scheduled", "a"),
    task("c1", "callback_scheduled", "a"),
    ...unassigned(2),
  ];
  const moves = balanceCallQueue(tasks, ["a", "b"]);

  assert.ok(
    moves.every((move) => move.to === "b"),
    "the caller already holding two callbacks was given more work",
  );
  assert.deepEqual(sortedLoads(tasks, moves), [2, 2]);
});

void test("a caller whose callbacks alone exceed a fair share absorbs nothing more", () => {
  const tasks = [
    ...Array.from({ length: 8 }, (_, i) => task(`c${i}`, "callback_scheduled", "a")),
    ...unassigned(2),
  ];
  const moves = balanceCallQueue(tasks, ["a", "b", "c"]);

  assert.equal(moves.length, 2);
  assert.ok(moves.every((move) => move.from === null && move.to !== "a"));
  assert.equal(loadsAfter(tasks, moves).get("a"), 8, "pinned work cannot be shed");
});

void test("an over-target caller sheds movables down to their pinned floor", () => {
  const tasks = [
    ...Array.from({ length: 6 }, (_, i) => task(`c${i}`, "callback_scheduled", "a")),
    ...Array.from({ length: 3 }, (_, i) => task(`n${i}`, "new", "a")),
  ];
  const moves = balanceCallQueue(tasks, ["a", "b"]);

  const loads = loadsAfter(tasks, moves);
  assert.equal(loads.get("a"), 6, "shed exactly down to the callbacks, not below");
  assert.equal(loads.get("b"), 3);
});

void test("an unassigned callback is movable — nobody owns that promise yet", () => {
  const tasks = [task("c0", "callback_scheduled", null)];

  assert.deepEqual(balanceCallQueue(tasks, ["a"]), [{ taskId: "c0", from: null, to: "a" }]);
});

void test("a caller who was not ticked keeps their whole book", () => {
  const held = [task("d0", "new", "d"), task("d1", "new", "d")];
  const tasks = [...held, ...unassigned(2)];
  const moves = balanceCallQueue(tasks, ["a", "b"]);

  assert.ok(
    moves.every((move) => move.taskId !== "d0" && move.taskId !== "d1"),
    "an unticked caller was raided",
  );
  assert.deepEqual(sortedLoads(tasks, moves), [1, 1, 2], "d keeps 2; a and b take one each");
});

void test("balancing an already-balanced queue is a no-op", () => {
  const tasks = [...unassigned(7), task("x", "new", "a")];
  const employees = ["a", "b", "c"];
  const settled = applied(tasks, balanceCallQueue(tasks, employees));

  assert.deepEqual(balanceCallQueue(settled, employees), []);
});

void test("without a max, a move never unassigns a task or targets an unticked caller", () => {
  const tasks = [
    ...unassigned(5),
    task("a0", "new", "a"),
    task("d0", "new", "d"),
    task("c0", "callback_scheduled", "b"),
  ];
  const employees = ["a", "b", "c"];

  for (const move of balanceCallQueue(tasks, employees)) {
    assert.notEqual(move.to, null, `${move.taskId} was unassigned with no cap in force`);
    assert.ok(employees.includes(move.to!), `move targeted ${move.to}`);
  }
});

void test("a caller ticked twice still only gets one share", () => {
  const tasks = unassigned(4);
  const moves = balanceCallQueue(tasks, ["a", "a", "b"]);

  assert.deepEqual(sortedLoads(tasks, moves), [2, 2]);
});

/* ---- max per caller ---- */

void test("a max nobody reaches changes nothing", () => {
  const tasks = unassigned(6);

  assert.deepEqual(
    balanceCallQueue(tasks, ["a", "b", "c"], 10),
    balanceCallQueue(tasks, ["a", "b", "c"]),
  );
});

void test("nobody is handed more than the max, and the surplus stays unassigned", () => {
  const tasks = unassigned(10);
  const moves = balanceCallQueue(tasks, ["a", "b"], 3);

  assert.deepEqual(sortedLoads(tasks, moves), [3, 3]);
  assert.equal(moves.length, 6, "the other four were left unassigned, not forced onto someone");
});

/*
 * The case that was silently doing nothing: every caller already sits above the
 * cap, so there is not a single free slot to place a shed task into. Handing
 * them back to their current owner made the whole control a no-op and reported
 * "already evenly split".
 */
void test("callers already over the max are cut down to it, and the excess is unassigned", () => {
  const tasks = [
    ...Array.from({ length: 5 }, (_, i) => task(`a${i}`, "new", "a")),
    ...Array.from({ length: 5 }, (_, i) => task(`b${i}`, "new", "b")),
  ];
  const moves = balanceCallQueue(tasks, ["a", "b"], 2);

  assert.deepEqual(sortedLoads(tasks, moves), [2, 2], "each caller was cut to the cap");
  assert.equal(moves.length, 6, "three off each caller");
  assert.ok(
    moves.every((move) => move.to === null),
    "the excess went back to the pool rather than to the other caller",
  );
});

void test("a big queue over a small cap parks everything the callers cannot hold", () => {
  const tasks = unassigned(16000);
  const moves = balanceCallQueue(tasks, ["a", "b", "c"], 100);

  assert.deepEqual(sortedLoads(tasks, moves), [100, 100, 100]);
  assert.equal(moves.length, 300, "only the placements are moves; 15700 were already unassigned");
});

void test("the excess a cap parks is the never-dialled work, not the rapport", () => {
  const tasks = [
    task("t-interested", "interested", "a"),
    task("t-attempted", "attempted", "a"),
    task("t-new-1", "new", "a"),
    task("t-new-2", "new", "a"),
  ];
  const moves = balanceCallQueue(tasks, ["a"], 2);

  assert.deepEqual(
    moves.map((move) => move.taskId).sort(),
    ["t-new-1", "t-new-2"],
    "a caller kept the two they had worked",
  );
  assert.ok(moves.every((move) => move.to === null));
});

void test("a parked task reports the owner it was taken from, for the audit row", () => {
  const tasks = Array.from({ length: 3 }, (_, i) => task(`a${i}`, "new", "a"));
  const moves = balanceCallQueue(tasks, ["a"], 1);

  assert.equal(moves.length, 2);
  assert.ok(
    moves.every((move) => move.from === "a" && move.to === null),
    "before/after must both read honestly",
  );
});

void test("scheduled callbacks can hold a caller above the max, since nobody else can take them", () => {
  const tasks = [
    ...Array.from({ length: 4 }, (_, i) => task(`c${i}`, "callback_scheduled", "a")),
    ...unassigned(4),
  ];
  const moves = balanceCallQueue(tasks, ["a", "b"], 2);

  const loads = loadsAfter(tasks, moves);
  assert.equal(loads.get("a"), 4, "pinned work cannot be shed to honour a cap");
  assert.equal(loads.get("b"), 2, "and the other caller still stops at the cap");
});

void test("balancing under a max is stable on a second run", () => {
  // Deliberately a queue the cap cannot fit: the second run must not re-park,
  // re-hand-out or otherwise churn what the first run already settled.
  const tasks = [
    ...unassigned(9),
    ...Array.from({ length: 4 }, (_, i) => task(`a${i}`, "new", "a")),
  ];
  const employees = ["a", "b", "c"];
  const settled = applied(tasks, balanceCallQueue(tasks, employees, 3));

  assert.deepEqual(balanceCallQueue(settled, employees, 3), []);
});

void test("`from` reports the real previous owner, which is what the audit row records", () => {
  const tasks = [...Array.from({ length: 3 }, (_, i) => task(`a${i}`, "new", "a")), task("u0")];
  const moves = balanceCallQueue(tasks, ["a", "b"]);

  const shed = moves.find((move) => move.taskId.startsWith("a"));
  const fresh = moves.find((move) => move.taskId === "u0");
  assert.equal(shed?.from, "a");
  assert.equal(fresh?.from, null);
});
