import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";
import test from "node:test";
import { and, eq, gte, ilike, isNotNull, lt, lte, or } from "drizzle-orm";
import { schema } from "@truelend/db";
/*
 * These predicates ARE the row-level authorization boundary. The fake drizzle
 * chain implements no leftJoin, orderBy or offset, so the query functions
 * themselves cannot be exercised — asserting the clause they build is the only
 * way to prove the scope actually reaches SQL. They live outside the
 * `server-only` query modules precisely so this test can reach them.
 */
import { leadWhere, loanCaseWhere, callTaskWhere } from "../lib/query-filters";

const noFilters = { page: 1 };

void test("a scoped lead read filters on the employee's own assignment", () => {
  assert.ok(
    isDeepStrictEqual(leadWhere(noFilters, "staff-1"), and(eq(schema.leads.assignedTo, "staff-1"))),
  );
});

void test("an admin lead read carries no assignment filter", () => {
  assert.ok(isDeepStrictEqual(leadWhere(noFilters, null), and(undefined)));
});

void test("a scoped lead read keeps the caller's other filters alongside the scope", () => {
  assert.ok(
    isDeepStrictEqual(
      leadWhere({ page: 1, status: "new" }, "staff-1"),
      and(eq(schema.leads.assignedTo, "staff-1"), eq(schema.leads.status, "new")),
    ),
  );
});

void test("a scoped loan-case read filters on the parent lead's assignment", () => {
  assert.ok(
    isDeepStrictEqual(
      loanCaseWhere(noFilters, "staff-1"),
      and(eq(schema.leads.assignedTo, "staff-1")),
    ),
  );
  assert.ok(isDeepStrictEqual(loanCaseWhere(noFilters, null), and(undefined)));
});

void test("a scoped call-queue read filters on the employee's own assignment", () => {
  assert.ok(
    isDeepStrictEqual(
      callTaskWhere(noFilters, "staff-1"),
      and(eq(schema.callTasks.assignedTo, "staff-1")),
    ),
  );
  assert.ok(isDeepStrictEqual(callTaskWhere(noFilters, null), and(undefined)));
});

void test("an employee's own scope survives an assignee filter naming someone else", () => {
  // The assignee filter is a convenience; it must never widen the scope.
  const clause = callTaskWhere({ page: 1, assignee: "staff-2" }, "staff-1");
  assert.ok(
    isDeepStrictEqual(
      clause,
      and(eq(schema.callTasks.assignedTo, "staff-1"), eq(schema.callTasks.assignedTo, "staff-2")),
    ),
  );
});

void test("a call-queue search normalizes the query for the phone half of the match", () => {
  // Every stored phone is a clean 10-digit number; a search typed or pasted
  // with +91/spaces must still reach it via the phone branch.
  const clause = callTaskWhere({ page: 1, q: "+91 98765 43210" }, null);
  assert.ok(
    isDeepStrictEqual(
      clause,
      and(
        or(
          ilike(schema.callTasks.name, "%+91 98765 43210%"),
          ilike(schema.callTasks.phone, "%9876543210%"),
        ),
      ),
    ),
  );
});

void test("a call-queue name search with no digits skips the phone branch entirely", () => {
  const clause = callTaskWhere({ page: 1, q: "Anil" }, null);
  assert.ok(isDeepStrictEqual(clause, and(or(ilike(schema.callTasks.name, "%Anil%")))));
});

/*
 * The date filters are the reason callTaskWhere takes an injectable `now`.
 * A bare YYYY-MM-DD carries no zone and a Worker runs in UTC, so every bound
 * below must land on an IST midnight — off by 5.5 hours and the filter
 * silently drops the edges of the range.
 */
void test("an added-on range covers whole IST days, not UTC ones", () => {
  const clause = callTaskWhere({ page: 1, from: "2026-08-05", to: "2026-08-05" }, null);

  assert.ok(
    isDeepStrictEqual(
      clause,
      and(
        gte(schema.callTasks.createdAt, new Date("2026-08-05T00:00:00+05:30")),
        // Exclusive next-IST-midnight, so the `to` day is included whole.
        lt(schema.callTasks.createdAt, new Date("2026-08-06T00:00:00+05:30")),
      ),
    ),
  );
});

void test("an overdue-callback filter compares against the injected instant", () => {
  const now = new Date("2026-08-05T09:00:00Z");
  const clause = callTaskWhere({ page: 1, callback: "overdue" }, null, now);

  assert.ok(isDeepStrictEqual(clause, and(lte(schema.callTasks.callbackAt, now))));
});

void test("a due-today callback window is the caller's IST day, not the server's UTC one", () => {
  // 20:30 UTC on the 4th is already 02:00 IST on the 5th — a UTC-based window
  // would put this caller on the wrong day entirely.
  const now = new Date("2026-08-04T20:30:00Z");
  const clause = callTaskWhere({ page: 1, callback: "today" }, null, now);

  assert.ok(
    isDeepStrictEqual(
      clause,
      and(
        and(
          gte(schema.callTasks.callbackAt, new Date("2026-08-05T00:00:00+05:30")),
          lt(schema.callTasks.callbackAt, new Date("2026-08-06T00:00:00+05:30")),
        ),
      ),
    ),
  );
});

void test("a scheduled-callback filter keys on the column, not the status", () => {
  const clause = callTaskWhere({ page: 1, callback: "scheduled" }, null);
  assert.ok(isDeepStrictEqual(clause, and(isNotNull(schema.callTasks.callbackAt))));
});

void test("source and product filters survive alongside an employee's own scope", () => {
  const clause = callTaskWhere(
    { page: 1, source: "jan-campaign", product: "home-loan" },
    "staff-1",
  );

  assert.ok(
    isDeepStrictEqual(
      clause,
      and(
        eq(schema.callTasks.assignedTo, "staff-1"),
        eq(schema.callTasks.source, "jan-campaign"),
        eq(schema.callTasks.productSlug, "home-loan"),
      ),
    ),
  );
});
