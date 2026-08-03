import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";
import test from "node:test";
import { and, eq } from "drizzle-orm";
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
