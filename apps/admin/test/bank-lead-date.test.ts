import assert from "node:assert/strict";
import test from "node:test";
import { parseBankDate } from "../lib/bank-lead-date";

void test("parseBankDate: extracts the date part from a timestamp cell", () => {
  assert.equal(parseBankDate("2026-06-09 00:00:00"), "2026-06-09");
  assert.equal(parseBankDate(" 2026-06-09 "), "2026-06-09");
});

void test("parseBankDate: rejects a shape-valid but impossible calendar date", () => {
  assert.equal(parseBankDate("2026-13-45"), null);
  assert.equal(parseBankDate("2026-02-31"), null);
  assert.equal(parseBankDate("2026-00-01"), null);
});

void test("parseBankDate: rejects malformed or empty cells without throwing", () => {
  assert.equal(parseBankDate(""), null);
  assert.equal(parseBankDate("09/06/2026"), null);
  assert.equal(parseBankDate("\\N"), null);
});

void test("parseBankDate: accepts a real leap day", () => {
  assert.equal(parseBankDate("2024-02-29"), "2024-02-29");
  assert.equal(parseBankDate("2026-02-29"), null);
});
