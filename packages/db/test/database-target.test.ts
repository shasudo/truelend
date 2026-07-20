import assert from "node:assert/strict";
import test from "node:test";
import { assertSafeDatabaseTarget } from "../scripts/database-target";

void test("local PostgreSQL targets are allowed without release credentials", () => {
  assert.doesNotThrow(() =>
    assertSafeDatabaseTarget("postgres://user:password@localhost:5432/truelend", {}),
  );
  assert.doesNotThrow(() =>
    assertSafeDatabaseTarget("postgresql://user:password@127.0.0.1/truelend", {}),
  );
});

void test("remote targets require explicit main-branch release intent", () => {
  const remote = "postgres://user:password@database.example.test/truelend";
  assert.throws(() => assertSafeDatabaseTarget(remote, {}), /main-branch release intent/);
  assert.throws(
    () => assertSafeDatabaseTarget(remote, { githubActions: "true" }),
    /main-branch release intent/,
  );
  assert.throws(
    () =>
      assertSafeDatabaseTarget(remote, {
        githubActions: "true",
        productionApproved: "true",
      }),
    /main-branch release intent/,
  );
  assert.doesNotThrow(() =>
    assertSafeDatabaseTarget(remote, {
      githubActions: "true",
      githubRef: "refs/heads/main",
      productionApproved: "true",
    }),
  );
});

void test("invalid database URLs fail before any connection is attempted", () => {
  assert.throws(() => assertSafeDatabaseTarget("not-a-url", {}), /valid PostgreSQL URL/);
  assert.throws(() => assertSafeDatabaseTarget("https://database.example.test", {}), /protocol/);
});
