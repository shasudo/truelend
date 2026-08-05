import type { CallStatus } from "@truelend/reference";

/*
 * Evens out an open call queue across a chosen set of callers.
 *
 * Pure and dependency-free for the same reason query-filters.ts is: the fake
 * drizzle chain implements no groupBy or aggregate, so this arithmetic could
 * never be exercised through a query. Everything about the database — which
 * rows are open, which are locked, who is still employed — belongs to the
 * action. This file only does the maths, which is the part that can be wrong
 * in a way nobody notices for weeks.
 *
 * ponytail: fairness is counted in tasks, not effort — 30 never-dialled rows
 * are not the same day's work as 30 `interested` ones, and ten callbacks all
 * due tomorrow balance against ten fresh rows. Weight by status only if
 * operators actually complain about the split.
 */

export interface BalanceTask {
  id: string;
  status: CallStatus;
  assignedTo: string | null;
}

export interface BalanceMove {
  taskId: string;
  /** Who held it before; null when it was unassigned. Carried so the audit row reads honestly without a second lookup. */
  from: string | null;
  to: string;
}

interface Bucket {
  id: string;
  /** callback_scheduled tasks this caller holds: counted, never moved. */
  pinned: number;
  /** Movable tasks already held. Sorted before shedding so the tail is what is given up. */
  own: BalanceTask[];
  /** How many open tasks this caller should end up holding. */
  cap: number;
}

const compareIds = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * How much a caller has invested in a task. Sorting their own tasks by this
 * descending puts what is worth keeping first, so the tail — the never-dialled
 * `new` rows — is what gets handed over. `interested` is where the rapport
 * lives, so it is the last thing taken from the person who built it.
 */
function keepRank(status: CallStatus): number {
  if (status === "interested") return 2;
  if (status === "attempted") return 1;
  return 0;
}

function byKeepOrder(a: BalanceTask, b: BalanceTask): number {
  return keepRank(b.status) - keepRank(a.status) || compareIds(a.id, b.id);
}

/**
 * Returns only the tasks that must change hands — never an unassignment, and
 * never a task whose current owner is already at or under their share.
 *
 * `tasks` must be the OPEN queue (the caller's where-clause excludes terminal
 * statuses), restricted to rows that are unassigned or held by one of
 * `employeeIds`. A row held by anyone else is ignored here too, so the SQL and
 * the maths agree even if one of them is edited later.
 */
export function balanceCallQueue(
  tasks: readonly BalanceTask[],
  employeeIds: readonly string[],
): BalanceMove[] {
  const buckets: Bucket[] = [...new Set(employeeIds)].map((id) => ({
    id,
    pinned: 0,
    own: [],
    cap: 0,
  }));
  if (buckets.length === 0) return [];
  const byOwner = new Map(buckets.map((bucket) => [bucket.id, bucket]));

  /** Tasks nobody in the selection holds. Every one of these is handed out below. */
  const unheld: BalanceTask[] = [];
  let total = 0;

  for (const task of tasks) {
    if (task.assignedTo === null) {
      unheld.push(task);
      total += 1;
      continue;
    }
    const owner = byOwner.get(task.assignedTo);
    // Held by a caller who was not selected. Deselecting someone means "give
    // them no new work", never "strip their book" — so this task is not moved,
    // and does not count towards anyone's share.
    if (!owner) continue;
    // A scheduled callback is a promise this caller made to this prospect for a
    // specific time; it moves with nobody. It is still work they have to do, so
    // it counts towards their share.
    if (task.status === "callback_scheduled") owner.pinned += 1;
    else owner.own.push(task);
    total += 1;
  }

  /*
   * Fair shares, largest pinned load first. That order is what makes the
   * arithmetic safe when one caller's callbacks alone already exceed an equal
   * share: they are capped at the load they cannot shed, and everyone else's
   * share is then recomputed from what is genuinely left to give out. Because
   * each step takes floor(left / still-to-set) and the last step takes all that
   * remains, the caps always sum to exactly `total` and never fall below
   * `pinned` — so no target can go negative, and there is no second
   * "redistribute the overflow" pass that could fail to settle.
   *
   * The id tie-break, not the order the checkboxes were ticked, is what makes
   * a re-run of an already-balanced queue produce zero moves.
   */
  buckets.sort((a, b) => b.pinned - a.pinned || compareIds(a.id, b.id));
  let left = total;
  buckets.forEach((bucket, index) => {
    bucket.cap = Math.max(bucket.pinned, Math.floor(left / (buckets.length - index)));
    left -= bucket.cap;
  });

  /*
   * Everyone keeps what they already hold, up to their cap; only the excess is
   * pooled. Balancing a queue is not reassigning it from scratch — a caller at
   * or under their share has every one of their tasks left alone.
   */
  for (const bucket of buckets) {
    const room = bucket.cap - bucket.pinned; // >= 0: cap is a max() over pinned
    if (bucket.own.length <= room) continue;
    bucket.own.sort(byKeepOrder);
    unheld.push(...bucket.own.splice(room));
  }

  /*
   * The caps sum to `total`, so the pooled tasks and the free slots are the
   * same count: one pass in cap order places every one of them. A caller who
   * gave a task up has zero room left, so nothing can be handed straight back
   * to the person it was just taken from.
   */
  unheld.sort(byKeepOrder);
  const moves: BalanceMove[] = [];
  let next = 0;
  for (const bucket of buckets) {
    for (let held = bucket.pinned + bucket.own.length; held < bucket.cap; held += 1) {
      const task = unheld[next];
      // Invariant, not a guard: the pool runs out exactly as the last slot fills.
      if (!task) return moves;
      next += 1;
      moves.push({ taskId: task.id, from: task.assignedTo, to: bucket.id });
    }
  }
  return moves;
}
