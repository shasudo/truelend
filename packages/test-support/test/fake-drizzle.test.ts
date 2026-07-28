import assert from "node:assert/strict";
import test from "node:test";

import { createFakeDb, type FakeRow, type FakeRowProvider } from "../src/fake-drizzle";

const usersTable = { name: "users" };
const ordersTable = { name: "orders" };

void test("select resolves rowsByTable's plain-array entry, both at top level and inside a transaction", async () => {
  const rows: FakeRow[] = [{ id: "u1" }];
  const db = createFakeDb({ rowsByTable: new Map([[usersTable, rows]]) });

  assert.deepEqual(await db.select().from(usersTable).where("anything").limit(1), rows);
  await db.transaction(async (tx) => {
    assert.deepEqual(await tx.select().from(usersTable), rows);
  });
});

void test("a FakeRowProvider sees the captured where/limit args and can withhold rows on a mismatch", async () => {
  const expectedId = "user-42";
  const row: FakeRow = { id: expectedId };
  const provider: FakeRowProvider = (query) =>
    query.whereArgs[0] === expectedId && query.limitArgs[0] === 1 ? [row] : [];
  const db = createFakeDb({ rowsByTable: new Map([[usersTable, provider]]) });

  const scoped = await db.select().from(usersTable).where(expectedId).limit(1);
  assert.deepEqual(scoped, [row]);

  const wrongUser = await db.select().from(usersTable).where("someone-else").limit(1);
  assert.deepEqual(wrongUser, []);
});

void test("insert resolves directly when awaited, and records onInsert", async () => {
  const calls: { table: unknown; values: FakeRow }[] = [];
  const db = createFakeDb({ onInsert: (table, values) => calls.push({ table, values }) });

  await db.insert(ordersTable).values({ item: "widget" });

  assert.deepEqual(calls, [{ table: ordersTable, values: { item: "widget" } }]);
});

void test("insert().returning() resolves configured rows, defaulting to empty", async () => {
  const withReturning = createFakeDb({
    returningRows: (table, values) => (table === ordersTable ? [{ id: "o1", ...values }] : []),
  });
  assert.deepEqual(await withReturning.insert(ordersTable).values({ item: "widget" }).returning(), [
    { id: "o1", item: "widget" },
  ]);

  const withoutReturning = createFakeDb();
  assert.deepEqual(
    await withoutReturning.insert(ordersTable).values({ item: "widget" }).returning(),
    [],
  );
});

void test("delete records onDelete and resolves", async () => {
  const deletes: unknown[] = [];
  const db = createFakeDb({ onDelete: (table) => deletes.push(table) });

  await db.delete(ordersTable).where("id", "o1");

  assert.deepEqual(deletes, [ordersTable]);
});

void test("transaction rejects with the configured error and never invokes the callback", async () => {
  const transactionError = new Error("connection reset");
  let callbackRan = false;
  const db = createFakeDb({ transactionError });

  await assert.rejects(
    db.transaction(async () => {
      callbackRan = true;
    }),
    transactionError,
  );
  assert.equal(callbackRan, false);
});

void test("transaction invokes the callback with a fresh query client and resolves to its return value", async () => {
  const db = createFakeDb({ rowsByTable: new Map([[usersTable, [{ id: "u1" }]]]) });

  const result = await db.transaction(async (tx) => {
    const rows = await tx.select().from(usersTable);
    return rows.length;
  });

  assert.equal(result, 1);
});

void test("$client resolves rawQueryRows as a callable tagged-template, defaulting to empty", async () => {
  const withRows = createFakeDb({ rawQueryRows: [{ user_id: "p1" }] });
  assert.deepEqual(await withRows.$client`select user_id from partners`, [{ user_id: "p1" }]);

  const withoutRows = createFakeDb();
  assert.deepEqual(await withoutRows.$client`select user_id from partners`, []);
});

void test("$client.end() resolves by default, records onClientEnd, and rejects with clientEndError when configured", async () => {
  let ended = false;
  const db = createFakeDb({ onClientEnd: () => (ended = true) });
  await db.$client.end();
  assert.equal(ended, true);

  const clientEndError = new Error("already closed");
  const failing = createFakeDb({ clientEndError });
  await assert.rejects(failing.$client.end(), clientEndError);
});
