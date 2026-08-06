"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, desc, eq, inArray, isNull, notInArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@truelend/db";
import { sendEnquiryFormLink } from "@truelend/email";
import {
  appUrls,
  customerConsentVersion,
  employeeCallStatusValues,
  isTerminalCallStatus,
  normalizeIndianMobile,
  productSlugs,
  rupeesToPaise,
  terminalCallStatusValues,
  validationMessages,
  validationPatterns,
} from "@truelend/reference";
import { type ActionResult } from "./action-result";
import { getMutationContext, isAdminUser } from "./auth";
import { balanceCallQueue } from "./balance-call-queue";
import { errorType } from "./error-type";
import { scheduleAdminRequestContextCleanup } from "./request-context-cleanup";

const UNKNOWN_STATUS_OUTCOME =
  "We couldn't confirm the call outcome. Reload this task before trying again.";
const UNKNOWN_ASSIGN_OUTCOME =
  "We couldn't confirm the assignment. Reload the call queue before trying again.";
const UNKNOWN_CONVERT_OUTCOME =
  "We couldn't confirm the conversion. Reload this task before trying again — it may already have a lead.";
const UNKNOWN_EMAIL_OUTCOME = "We couldn't confirm the send. Check the task before trying again.";
const UNKNOWN_BALANCE_OUTCOME =
  "We couldn't confirm the redistribution. Reload the call queue before trying again.";
/*
 * Covers both a guessed id and a task that fell out of the caller's scope
 * (reassigned to someone else, say) — the query can't and shouldn't tell them
 * apart (see taskScope above), so the copy must read honestly for the far
 * more common, entirely benign case rather than sounding like data loss.
 */
const TASK_OUT_OF_SCOPE =
  "This task is no longer in your queue — it may have been reassigned or closed. Reload the call queue and try again.";

function reportCrmActionFailure(event: string, error: unknown): void {
  console.error(JSON.stringify({ event, errorType: errorType(error) }));
}

/**
 * Employees work only their own queue. Admins get `undefined` — no restriction.
 * Folded into the where-clause so a task that is not theirs is simply not
 * found, which is also the right answer for a guessed id.
 */
function taskScope(user: { id: string; role?: string | null }) {
  return isAdminUser(user) ? undefined : eq(schema.callTasks.assignedTo, user.id);
}

/* ---- assignment (admin only) ---- */

const assignSchema = z.object({
  // Bulk, because assigning a freshly imported list one row at a time is the
  // actual job. The cap bounds one statement's parameter count.
  taskIds: z.array(z.string().uuid()).min(1).max(200),
  // "" means unassign.
  assignedTo: z.string().optional(),
});

export async function assignCallTasksAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  let context: Awaited<ReturnType<typeof getMutationContext>>;
  try {
    context = await getMutationContext();
  } catch (error) {
    reportCrmActionFailure("crm_assign_context_failed", error);
    return { error: UNKNOWN_ASSIGN_OUTCOME };
  }
  const { db, ctx, user } = context;
  if (!user) {
    scheduleAdminRequestContextCleanup({ db, ctx });
    redirect("/login");
  }

  try {
    if (!isAdminUser(user)) return { error: "Not authorized." };
    const parsed = assignSchema.safeParse({
      taskIds: formData.getAll("taskIds").map(String),
      assignedTo: formData.get("assignedTo") ?? undefined,
    });
    if (!parsed.success) return { error: "Select at least one call task to assign." };
    const assignedTo =
      parsed.data.assignedTo && parsed.data.assignedTo.length > 0 ? parsed.data.assignedTo : null;
    // A hand-crafted request (never the checkbox UI, which can't repeat a
    // value) could repeat an id and inflate the audit count below the actual
    // row count.
    const taskIds = [...new Set(parsed.data.taskIds)];

    const outcome = await db.transaction(async (tx) => {
      if (assignedTo) {
        const [staff] = await tx
          .select({ id: schema.user.id })
          .from(schema.user)
          .where(
            and(
              eq(schema.user.id, assignedTo),
              inArray(schema.user.role, ["admin", "employee"]),
              or(isNull(schema.user.banned), eq(schema.user.banned, false)),
            ),
          )
          .limit(1);
        if (!staff) return { kind: "invalid_assignee" } as const;
      }

      // Locks every selected row for the rest of this transaction, so a second
      // bulk-assign touching the same tasks blocks here rather than silently
      // overwriting this one the instant it commits.
      const current = await tx
        .select({
          id: schema.callTasks.id,
          status: schema.callTasks.status,
          assignedTo: schema.callTasks.assignedTo,
        })
        .from(schema.callTasks)
        .where(inArray(schema.callTasks.id, taskIds))
        .for("update");

      // A closed task has nothing left to do; reassigning it is almost never
      // what was intended; the default queue view shows every status side by
      // side, so it is easy to sweep one into a selection by accident.
      const assignable = current.filter((task) => !isTerminalCallStatus(task.status));
      const skipped = current.length - assignable.length;
      if (assignable.length === 0) return { kind: "none_assignable" } as const;

      await tx
        .update(schema.callTasks)
        .set({ assignedTo })
        .where(
          inArray(
            schema.callTasks.id,
            assignable.map((task) => task.id),
          ),
        );

      // One row per task, not one summary row: this is what makes the change
      // show up in that task's own "Call history" (entityId = task.id) and
      // records exactly who had it before — a plain bulk-summary row with no
      // entityId is invisible everywhere a person would actually look.
      await tx.insert(schema.auditLog).values(
        assignable.map((task) => ({
          actorId: user.id,
          actorEmail: user.email,
          action: "call_task.assign",
          entityType: "call_task",
          entityId: task.id,
          before: { assignedTo: task.assignedTo },
          after: { assignedTo },
        })),
      );
      return { kind: "assigned", count: assignable.length, skipped } as const;
    });

    if (outcome.kind === "invalid_assignee") {
      return { error: "The selected assignee is no longer available." };
    }
    if (outcome.kind === "none_assignable") {
      return { error: "Every selected task is already closed. There is nothing to assign." };
    }
    revalidatePath("/crm");
    return outcome.skipped > 0
      ? {
          ok: true,
          notice: `${outcome.skipped} of ${outcome.skipped + outcome.count} selected tasks were already closed and were skipped.`,
        }
      : { ok: true };
  } catch (error) {
    reportCrmActionFailure("crm_assign_failed", error);
    return { error: UNKNOWN_ASSIGN_OUTCOME };
  } finally {
    scheduleAdminRequestContextCleanup({ db, ctx });
  }
}

/* ---- balance the open queue across a chosen set of callers (admin only) ---- */

/*
 * The whole open queue in one transaction. Past this the run is refused
 * outright rather than balancing a subset, because a partial balance looks
 * exactly like a complete one and nothing downstream would ever surface the
 * difference.
 *
 * ponytail: 20000 is sized off a real queue (~16k open) with headroom, not off
 * a measurement. The cost that scales is round-trips, not rows: one locking
 * SELECT, one UPDATE per 1000 ids, one audit INSERT per 500 rows — so a full
 * 20k run is ~60 statements, not 20000. Raise it further only with a timing
 * measured against Hyperdrive; this account has no Queue, Durable Object or
 * cron binding to move the work off the request if it stops fitting.
 */
const MAX_BALANCE_TASKS = 20000;
/** Rows per audit INSERT. 500 x 7 columns is well inside Postgres' 65535 bind parameters. */
const BALANCE_CHUNK = 500;
/** Ids per UPDATE ... WHERE id IN (...), for the same parameter budget. */
const BALANCE_UPDATE_CHUNK = 1000;

const balanceSchema = z.object({
  // Staff ids are better-auth text, not uuid. 50 is far more callers than this
  // team will ever have, and it bounds the staff lookup's parameter count.
  employeeIds: z.array(z.string().trim().min(1).max(64)).min(1).max(50),
  // Blank means "no ceiling" — the original behaviour.
  maxPerEmployee: z.coerce.number().int().min(1).max(MAX_BALANCE_TASKS).optional(),
});

export async function balanceCallQueueAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  let context: Awaited<ReturnType<typeof getMutationContext>>;
  try {
    context = await getMutationContext();
  } catch (error) {
    reportCrmActionFailure("crm_balance_context_failed", error);
    return { error: UNKNOWN_BALANCE_OUTCOME };
  }
  const { db, ctx, user } = context;
  if (!user) {
    scheduleAdminRequestContextCleanup({ db, ctx });
    redirect("/login");
  }

  try {
    if (!isAdminUser(user)) return { error: "Not authorized." };
    const rawMax = String(formData.get("maxPerEmployee") ?? "").trim();
    const parsed = balanceSchema.safeParse({
      employeeIds: formData.getAll("employeeIds").map(String),
      maxPerEmployee: rawMax === "" ? undefined : rawMax,
    });
    if (!parsed.success) {
      return {
        error: parsed.error.issues.some((issue) => issue.path[0] === "maxPerEmployee")
          ? `The per-caller maximum must be a whole number between 1 and ${MAX_BALANCE_TASKS}, or blank for no limit.`
          : "Pick at least one caller to balance the queue across.",
      };
    }
    const employeeIds = [...new Set(parsed.data.employeeIds)];
    const maxPerEmployee = parsed.data.maxPerEmployee;

    const outcome = await db.transaction(async (tx) => {
      /*
       * One balance at a time. Two runs would otherwise lock overlapping halves
       * of the same queue in whatever order their scans happened to take, and
       * deadlock; a second click just waits here and then finds nothing left to
       * move. Same per-transaction advisory lock convertCallTaskAction uses,
       * released on commit or rollback.
       */
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext('balance_call_queue'))`);

      const staff = await tx
        .select({ id: schema.user.id })
        .from(schema.user)
        .where(
          and(
            inArray(schema.user.id, employeeIds),
            inArray(schema.user.role, ["admin", "employee"]),
            or(isNull(schema.user.banned), eq(schema.user.banned, false)),
          ),
        );
      // All or nothing. If one of the chosen callers was just banned or
      // demoted, an even split across whoever is left is not what was asked
      // for — and silently dropping them would look like the run succeeded.
      if (staff.length !== employeeIds.length) return { kind: "invalid_assignee" } as const;

      /*
       * The pool the split is computed from. This where-clause IS the "leave
       * everyone else's book alone" rule: a task held by an unselected caller is
       * never read and never moved. No search/product/source filter is accepted
       * — balancing a filtered slice produces a split that looks fair and is not.
       *
       * Deliberately NOT `FOR UPDATE`. An open queue is mostly rows this run will
       * never touch — a capped 16000-task queue changes about 1200 of them — and
       * locking every one of them made the statement's cost scale with the queue
       * instead of with the work. The advisory lock above already serialises
       * balance against balance; the rows actually being written are locked and
       * re-checked below, which is what protects them from a concurrent assign or
       * status update.
       *
       * Ordered by id for a stable read, and limited to one past the cap so an
       * oversized queue is detected before any of it is locked.
       */
      const pool = await tx
        .select({
          id: schema.callTasks.id,
          status: schema.callTasks.status,
          assignedTo: schema.callTasks.assignedTo,
        })
        .from(schema.callTasks)
        .where(
          and(
            notInArray(schema.callTasks.status, [...terminalCallStatusValues]),
            or(
              isNull(schema.callTasks.assignedTo),
              inArray(schema.callTasks.assignedTo, employeeIds),
            ),
          ),
        )
        .orderBy(schema.callTasks.id)
        .limit(MAX_BALANCE_TASKS + 1);
      if (pool.length > MAX_BALANCE_TASKS) return { kind: "too_large" } as const;

      const moves = balanceCallQueue(pool, employeeIds, maxPerEmployee);
      const unassignedBefore = pool.filter((task) => task.assignedTo === null).length;
      if (moves.length === 0) {
        return {
          kind: "settled",
          pooled: pool.length,
          unassignedAfter: unassignedBefore,
          parked: 0,
          drifted: 0,
        } as const;
      }

      /*
       * Now take the locks, on exactly the rows about to be written and nothing
       * else. Sorted by id so the chunks are claimed in a stable order, which is
       * what keeps this from deadlocking against a concurrent bulk assign.
       */
      const movedIds = moves.map((move) => move.taskId).sort();
      const current = new Map<string, { status: string; assignedTo: string | null }>();
      for (let i = 0; i < movedIds.length; i += BALANCE_UPDATE_CHUNK) {
        const rows = await tx
          .select({
            id: schema.callTasks.id,
            status: schema.callTasks.status,
            assignedTo: schema.callTasks.assignedTo,
          })
          .from(schema.callTasks)
          .where(inArray(schema.callTasks.id, movedIds.slice(i, i + BALANCE_UPDATE_CHUNK)))
          .orderBy(schema.callTasks.id)
          .for("update");
        for (const row of rows) current.set(row.id, row);
      }

      /*
       * A task someone reassigned or closed between the unlocked read and these
       * locks is dropped rather than failing the whole run: with a queue this
       * size and callers working it live, one closed task must not cost the
       * operator the other 1199 moves. The split ends up off by however many
       * drifted, which a re-run settles — and the count is reported, so it is
       * never a silent difference.
       */
      const applicable = moves.filter((move) => {
        const row = current.get(move.taskId);
        return (
          row !== undefined && row.assignedTo === move.from && !isTerminalCallStatus(row.status)
        );
      });
      const drifted = moves.length - applicable.length;

      /*
       * The resulting state, not the delta — this is what the operator is told,
       * and a cap that parked half the queue must never read as a clean split.
       * Counted off `applicable`, so a dropped task is not reported as moved.
       */
      let unassignedAfter = unassignedBefore;
      let parked = 0;
      for (const move of applicable) {
        if (move.to === null) {
          unassignedAfter += 1;
          parked += 1;
        } else if (move.from === null) {
          unassignedAfter -= 1;
        }
      }
      if (applicable.length === 0) {
        return { kind: "settled", pooled: pool.length, unassignedAfter, parked, drifted } as const;
      }

      /*
       * Grouped by destination, so this is one UPDATE per caller rather than per
       * task — plus one for `null`, the tasks a cap sent back to the unassigned
       * pool. Chunked because a single caller can legitimately take the whole
       * queue, and 20000 bind parameters in one statement is neither necessary
       * nor kind to the query planner.
       */
      const idsByOwner = new Map<string | null, string[]>();
      for (const move of applicable) {
        const ids = idsByOwner.get(move.to);
        if (ids) ids.push(move.taskId);
        else idsByOwner.set(move.to, [move.taskId]);
      }
      for (const [owner, ids] of idsByOwner) {
        for (let i = 0; i < ids.length; i += BALANCE_UPDATE_CHUNK) {
          await tx
            .update(schema.callTasks)
            .set({ assignedTo: owner })
            .where(inArray(schema.callTasks.id, ids.slice(i, i + BALANCE_UPDATE_CHUNK)));
        }
      }

      /*
       * One row per task, same as a bulk assign and for the same reason: this
       * is what puts the change in that task's own "Call history" (entityId =
       * task.id) alongside who held it before, which is the only place anyone
       * looks when they ask where their task went. A distinct action string, so
       * a redistribution is never mistaken for a hand-picked assignment. An
       * `after.assignedTo` of null is a task the cap parked, and reads as one.
       */
      const auditRows = applicable.map((move) => ({
        actorId: user.id,
        actorEmail: user.email,
        action: "call_task.balance",
        entityType: "call_task",
        entityId: move.taskId,
        before: { assignedTo: move.from },
        after: { assignedTo: move.to },
      }));
      for (let i = 0; i < auditRows.length; i += BALANCE_CHUNK) {
        await tx.insert(schema.auditLog).values(auditRows.slice(i, i + BALANCE_CHUNK));
      }
      return {
        kind: "balanced",
        moved: applicable.length,
        pooled: pool.length,
        unassignedAfter,
        parked,
        drifted,
      } as const;
    });

    if (outcome.kind === "invalid_assignee") {
      return { error: "One of the selected callers is no longer available. Reload and try again." };
    }
    if (outcome.kind === "too_large") {
      return {
        error: `The open queue is over ${MAX_BALANCE_TASKS} tasks, which is more than one balance can move at once. Close out or bulk-assign some, then try again.`,
      };
    }
    /*
     * The shape of the run, not its contents. A balance that dies inside the
     * Worker rather than throwing leaves no other trace, so this line is what
     * tells the next investigation how big the pool actually was and how much
     * work the transaction was asked to do.
     */
    console.log(
      JSON.stringify({
        event: "crm_balance_completed",
        pooled: outcome.pooled,
        moved: outcome.kind === "balanced" ? outcome.moved : 0,
        parked: outcome.parked,
        drifted: outcome.drifted,
        callers: employeeIds.length,
        maxPerEmployee: maxPerEmployee ?? null,
      }),
    );
    revalidatePath("/crm");
    /*
     * Whatever the cap left in the unassigned pool is always said out loud. It
     * is the one number an operator would otherwise misread as a clean split —
     * which is exactly what "already evenly split" used to claim while a cap was
     * quietly holding thousands of tasks back.
     */
    const pooledNote =
      outcome.unassignedAfter > 0
        ? ` ${outcome.unassignedAfter} ${outcome.unassignedAfter === 1 ? "task is" : "tasks are"} now unassigned${maxPerEmployee ? ` — the cap of ${maxPerEmployee} per caller left no room` : ""}.`
        : "";
    if (outcome.kind === "settled") {
      return {
        ok: true,
        notice:
          outcome.pooled === 0
            ? "There are no open tasks to balance."
            : `Every ticked caller is already within their share — nothing moved.${pooledNote}`,
      };
    }
    const callerCount = `${employeeIds.length} ${employeeIds.length === 1 ? "caller" : "callers"}`;
    const parkedNote =
      outcome.parked > 0
        ? ` ${outcome.parked} over the cap ${outcome.parked === 1 ? "was" : "were"} unassigned.`
        : "";
    // Never silent: a re-run settles these, but only if the operator knows to.
    const driftedNote =
      outcome.drifted > 0
        ? ` ${outcome.drifted} ${outcome.drifted === 1 ? "task was" : "tasks were"} reassigned or closed mid-run and left alone — balance again to settle them.`
        : "";
    return {
      ok: true,
      notice: `Moved ${outcome.moved} of ${outcome.pooled} open tasks across ${callerCount}${maxPerEmployee ? `, max ${maxPerEmployee} each` : ""}.${parkedNote}${pooledNote}${driftedNote}`,
    };
  } catch (error) {
    reportCrmActionFailure("crm_balance_failed", error);
    return { error: UNKNOWN_BALANCE_OUTCOME };
  } finally {
    scheduleAdminRequestContextCleanup({ db, ctx });
  }
}

/* ---- call outcome ---- */

const statusSchema = z
  .object({
    taskId: z.string().uuid(),
    // `converted` is deliberately not in this enum: only the conversion action
    // writes it, and only once a lead row exists.
    status: z.enum(employeeCallStatusValues),
    callbackAt: z.string().trim().optional(),
    note: z.string().trim().max(4000).optional(),
  })
  .refine((v) => v.status !== "callback_scheduled" || Boolean(v.callbackAt), {
    message: "Pick a callback date and time.",
    path: ["callbackAt"],
  });

export async function updateCallTaskStatusAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  let context: Awaited<ReturnType<typeof getMutationContext>>;
  try {
    context = await getMutationContext();
  } catch (error) {
    reportCrmActionFailure("crm_status_context_failed", error);
    return { error: UNKNOWN_STATUS_OUTCOME };
  }
  const { db, ctx, user } = context;
  if (!user) {
    scheduleAdminRequestContextCleanup({ db, ctx });
    redirect("/login");
  }

  try {
    const parsed = statusSchema.safeParse({
      taskId: formData.get("taskId"),
      status: formData.get("status"),
      callbackAt: formData.get("callbackAt") ?? undefined,
      note: formData.get("note") ?? undefined,
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid call outcome." };
    }
    /*
     * A datetime-local value carries no zone, and a Worker runs in UTC — so a
     * bare `new Date("2026-08-05T14:30")` would store 14:30 UTC for a caller who
     * meant 14:30 IST, and every callback would come due 5.5 hours late. Pin the
     * offset explicitly so the stored instant is right in dev and in production.
     * ponytail: IST is hardcoded because the whole product is India-only (rupees,
     * Indian mobile validation, en-IN formatting). Take the offset from the
     * client if staff ever work from another zone.
     */
    const callbackAt =
      parsed.data.status === "callback_scheduled" && parsed.data.callbackAt
        ? new Date(`${parsed.data.callbackAt}+05:30`)
        : null;
    if (callbackAt && Number.isNaN(callbackAt.getTime())) {
      return { error: "Pick a callback date and time." };
    }

    const outcome = await db.transaction(async (tx) => {
      const [task] = await tx
        .select({ status: schema.callTasks.status, callbackAt: schema.callTasks.callbackAt })
        .from(schema.callTasks)
        .where(and(eq(schema.callTasks.id, parsed.data.taskId), taskScope(user)))
        .limit(1)
        .for("update");
      // Not found and not yours deliberately return the same outcome.
      if (!task) return "missing" as const;
      if (task.status === "converted") return "converted" as const;
      // Every terminal status closes the task, not just "converted" — a
      // wrong_number/not_interested task must refuse a further outcome the
      // same way the UI already hides the form for one.
      if (isTerminalCallStatus(task.status)) return "terminal" as const;

      await tx
        .update(schema.callTasks)
        .set({ status: parsed.data.status, callbackAt })
        .where(eq(schema.callTasks.id, parsed.data.taskId));
      await tx.insert(schema.auditLog).values({
        actorId: user.id,
        actorEmail: user.email,
        action: "call_task.status_update",
        entityType: "call_task",
        entityId: parsed.data.taskId,
        before: { status: task.status, callbackAt: task.callbackAt },
        // The caller's note rides the outcome that produced it, which is why
        // there is no separate notes table.
        after: { status: parsed.data.status, callbackAt, note: parsed.data.note },
      });
      return "updated" as const;
    });
    if (outcome === "missing") return { error: TASK_OUT_OF_SCOPE };
    if (outcome === "converted") {
      return { error: "This task already became a lead. Work it from the lead instead." };
    }
    if (outcome === "terminal") {
      return { error: "This task is already closed. No further outcome can be recorded." };
    }
    revalidatePath(`/crm/${parsed.data.taskId}`);
    revalidatePath("/crm");
    return { ok: true };
  } catch (error) {
    reportCrmActionFailure("crm_status_update_failed", error);
    return { error: UNKNOWN_STATUS_OUTCOME };
  } finally {
    scheduleAdminRequestContextCleanup({ db, ctx });
  }
}

/* ---- conversion ---- */

const convertSchema = z.object({
  taskId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  phone: z
    .string()
    .trim()
    .transform(normalizeIndianMobile)
    .refine((v) => validationPatterns.indianMobile.test(v), validationMessages.indianMobile),
  email: z.string().trim().max(254).email().optional().or(z.literal("")),
  city: z.string().trim().max(80).optional(),
  productSlug: z.enum(productSlugs).optional().or(z.literal("")),
  loanAmount: z.string().trim().max(24).optional(),
  message: z.string().trim().max(2000).optional(),
  // The caller attests that the prospect agreed on the call. Without it the
  // lead would have to be written consent:false, which satisfies the database
  // but leaves a row nobody is allowed to contact.
  consent: z.literal("on", { message: "Confirm the prospect consented on the call." }),
});

const blank = (value: string | undefined) => (value && value.length > 0 ? value : null);

export async function convertCallTaskAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  let context: Awaited<ReturnType<typeof getMutationContext>>;
  try {
    context = await getMutationContext();
  } catch (error) {
    reportCrmActionFailure("crm_convert_context_failed", error);
    return { error: UNKNOWN_CONVERT_OUTCOME };
  }
  const { db, ctx, user } = context;
  if (!user) {
    scheduleAdminRequestContextCleanup({ db, ctx });
    redirect("/login");
  }

  try {
    const parsed = convertSchema.safeParse({
      taskId: formData.get("taskId"),
      name: formData.get("name"),
      phone: formData.get("phone"),
      email: formData.get("email") ?? undefined,
      city: formData.get("city") ?? undefined,
      productSlug: formData.get("productSlug") ?? undefined,
      loanAmount: formData.get("loanAmount") ?? undefined,
      message: formData.get("message") ?? undefined,
      consent: formData.get("consent") ?? undefined,
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Check the highlighted fields." };
    }
    const d = parsed.data;

    let convertedLeadId: string | undefined;
    const outcome = await db.transaction(async (tx) => {
      const [task] = await tx
        .select({
          id: schema.callTasks.id,
          status: schema.callTasks.status,
          // The number we actually dialled. The link lookup below must key on
          // this, never on the submitted field — see the comment there.
          phone: schema.callTasks.phone,
          leadId: schema.callTasks.leadId,
          assignedTo: schema.callTasks.assignedTo,
        })
        .from(schema.callTasks)
        .where(and(eq(schema.callTasks.id, d.taskId), taskScope(user)))
        .limit(1)
        .for("update");
      if (!task) return "missing" as const;
      if (task.leadId) return "already_converted" as const;
      if (isTerminalCallStatus(task.status)) return "terminal" as const;

      /*
       * Serializes every conversion for this phone number. Without this, two
       * call tasks that share a number (e.g. a duplicate CSV import) converting
       * at the same moment could both see "no existing lead" below and both
       * insert one. The lock is per-transaction and releases itself on
       * commit/rollback — a concurrent waiter just blocks here until this
       * transaction finishes, then its own lookup finds the lead just created
       * (or linked) and links to it instead of duplicating it.
       */
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${task.phone}))`);

      /*
       * The prospect may have filled the public form themselves after the call,
       * in which case the website worker already made the lead. Link that row
       * rather than minting a second one for the same person.
       *
       * Keyed on the task's stored phone, NOT the submitted one: the form field
       * is editable, and keying on it would let a caller point their task at any
       * lead in the system by typing that number — writing a note into a lead
       * they cannot read, and leaving the real prospect without a lead. The
       * submitted phone only ever populates a newly created row.
       */
      const [existing] = await tx
        .select({
          id: schema.leads.id,
          name: schema.leads.name,
          email: schema.leads.email,
          city: schema.leads.city,
          productSlug: schema.leads.productSlug,
          loanAmountPaise: schema.leads.loanAmountPaise,
          assignedTo: schema.leads.assignedTo,
        })
        .from(schema.leads)
        .where(eq(schema.leads.phone, task.phone))
        .orderBy(desc(schema.leads.createdAt))
        .limit(1);

      let leadId = existing?.id;
      const linkedExisting = Boolean(leadId);

      if (!leadId) {
        const [lead] = await tx
          .insert(schema.leads)
          .values({
            // `enquiry` needs name + phone, which convertSchema guarantees, so
            // leads_required_fields holds. A dedicated kind would break four
            // exhaustive maps for no gain.
            kind: "enquiry",
            name: d.name,
            phone: d.phone,
            email: blank(d.email),
            city: blank(d.city),
            productSlug: blank(d.productSlug),
            message: blank(d.message),
            loanAmountPaise: rupeesToPaise(d.loanAmount),
            status: "new",
            // A creation default, not an assignment control: the caller keeps
            // the person they just spoke to. Only an admin can move it after.
            assignedTo: task.assignedTo ?? user.id,
            // All three proof columns together, or leads_consent_proof rejects it.
            consent: true,
            consentAt: new Date(),
            consentSource: "crm_call",
            consentVersion: customerConsentVersion,
          })
          .returning({ id: schema.leads.id });
        if (!lead) throw new Error("Lead insert returned no identifier");
        leadId = lead.id;
      } else if (existing) {
        /*
         * Fill only the gaps. The existing row is usually the prospect's own
         * form submission, which is richer than a CSV-seeded task, so its
         * values win; but anything it left empty should still receive what the
         * caller just captured rather than being silently dropped on the floor.
         */
        const filled = {
          ...(existing.name === null && { name: d.name }),
          ...(existing.email === null && blank(d.email) !== null && { email: blank(d.email) }),
          ...(existing.city === null && blank(d.city) !== null && { city: blank(d.city) }),
          ...(existing.productSlug === null &&
            blank(d.productSlug) !== null && { productSlug: blank(d.productSlug) }),
          ...(existing.loanAmountPaise === null &&
            rupeesToPaise(d.loanAmount) !== null && {
              loanAmountPaise: rupeesToPaise(d.loanAmount),
            }),
          // An unassigned website lead becomes the caller's; an already-assigned
          // one keeps its owner, since only an admin may reassign.
          ...(existing.assignedTo === null && { assignedTo: task.assignedTo ?? user.id }),
        };
        if (Object.keys(filled).length > 0) {
          await tx.update(schema.leads).set(filled).where(eq(schema.leads.id, leadId));
        }
      }

      await tx
        .update(schema.callTasks)
        .set({ status: "converted", leadId })
        .where(eq(schema.callTasks.id, d.taskId));

      await tx.insert(schema.leadNotes).values({
        leadId,
        authorId: user.id,
        body: d.message
          ? `Converted from the call queue.\n\n${d.message}`
          : "Converted from the call queue.",
      });

      await tx.insert(schema.auditLog).values({
        actorId: user.id,
        actorEmail: user.email,
        action: "call_task.convert",
        entityType: "call_task",
        entityId: d.taskId,
        before: { status: task.status },
        after: { leadId, linkedExisting },
      });
      if (!linkedExisting) {
        // Same action string the public forms write, so getLead's existing
        // attribution read finds a row instead of nothing.
        await tx.insert(schema.auditLog).values({
          actorId: user.id,
          actorEmail: user.email,
          action: "lead.create",
          entityType: "lead",
          entityId: leadId,
          after: {
            source: "crm_call",
            kind: "enquiry",
            callTaskId: d.taskId,
            consentVersion: customerConsentVersion,
          },
        });
      }
      convertedLeadId = leadId;
      return linkedExisting ? ("linked" as const) : ("created" as const);
    });

    if (outcome === "missing") return { error: TASK_OUT_OF_SCOPE };
    if (outcome === "already_converted") {
      return { error: "This task already has a lead." };
    }
    if (outcome === "terminal") {
      return { error: "This task is closed. Reopen the outcome before converting it." };
    }
    revalidatePath(`/crm/${d.taskId}`);
    revalidatePath("/crm");
    revalidatePath("/leads");
    if (convertedLeadId) revalidatePath(`/leads/${convertedLeadId}`);
    return outcome === "linked"
      ? {
          ok: true,
          notice:
            "A lead already existed for this number, so the task was linked to it. Its existing details were kept; only blank fields were filled in.",
        }
      : { ok: true };
  } catch (error) {
    reportCrmActionFailure("crm_convert_failed", error);
    return { error: UNKNOWN_CONVERT_OUTCOME };
  } finally {
    scheduleAdminRequestContextCleanup({ db, ctx });
  }
}

/* ---- send the prospect the public form ---- */

const emailSchema = z.object({ taskId: z.string().uuid() });

/** Collapses double-clicks and retries without blocking a genuine later resend. */
const RESEND_WINDOW_MS = 5 * 60 * 1000;

export async function emailEnquiryFormAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  let context: Awaited<ReturnType<typeof getMutationContext>>;
  try {
    context = await getMutationContext();
  } catch (error) {
    reportCrmActionFailure("crm_form_email_context_failed", error);
    return { error: UNKNOWN_EMAIL_OUTCOME };
  }
  const { db, ctx, env, user } = context;
  if (!user) {
    scheduleAdminRequestContextCleanup({ db, ctx });
    redirect("/login");
  }

  try {
    const parsed = emailSchema.safeParse({ taskId: formData.get("taskId") });
    if (!parsed.success) return { error: "Call task not found." };

    const [task] = await db
      .select({
        name: schema.callTasks.name,
        email: schema.callTasks.email,
        productSlug: schema.callTasks.productSlug,
      })
      .from(schema.callTasks)
      .where(and(eq(schema.callTasks.id, parsed.data.taskId), taskScope(user)))
      .limit(1);
    if (!task) return { error: TASK_OUT_OF_SCOPE };
    if (!task.email) {
      return { error: "This prospect has no email address. Copy the link and send it instead." };
    }

    // A distinct key prefix on the shared auth limiter — the same trick the KYC
    // upload uses — so no new rate-limit namespace or binding is needed.
    const allowed = await env.AUTH_RATE_LIMITER.limit({ key: `crm-form-email:${user.id}` });
    if (!allowed.success) return { error: "Too many emails. Please wait a minute." };

    const url = `${appUrls.website}/enquiry${task.productSlug ? `?product=${encodeURIComponent(task.productSlug)}` : ""}`;
    // Awaited, not backgrounded: sending the link IS the operator's intent
    // here, so a failure has to reach them rather than becoming a log line.
    const result = await sendEnquiryFormLink(env, {
      to: task.email,
      name: task.name,
      url,
      idempotencyKey: `enquiry_form_link:${parsed.data.taskId}:${Math.floor(Date.now() / RESEND_WINDOW_MS)}`,
    });
    if (!result.ok) {
      console.error(
        JSON.stringify({ event: "crm_form_email_rejected", status: result.status ?? null }),
      );
      return { error: "We couldn't send the form link. Try again, or copy the link instead." };
    }

    // A lone statement with no paired mutation, so it is not a transaction: a
    // tx here would wrap one insert and prove nothing.
    await db.insert(schema.auditLog).values({
      actorId: user.id,
      actorEmail: user.email,
      action: "call_task.form_emailed",
      entityType: "call_task",
      entityId: parsed.data.taskId,
      after: { sent: true, skipped: result.skipped ?? false },
    });
    revalidatePath(`/crm/${parsed.data.taskId}`);
    return result.skipped
      ? { ok: true, notice: "Email is not configured here, so nothing was actually sent." }
      : { ok: true };
  } catch (error) {
    reportCrmActionFailure("crm_form_email_failed", error);
    return { error: UNKNOWN_EMAIL_OUTCOME };
  } finally {
    scheduleAdminRequestContextCleanup({ db, ctx });
  }
}
