import assert from "node:assert/strict";
import test from "node:test";
import { callTaskCsvColumns } from "@truelend/reference";
// Pure module with no mocked dependencies, so a static import is safe here.
import { parseCsv, mapHeader, UnbalancedQuoteError } from "../lib/csv";

void test("a quoted field keeps its commas", () => {
  assert.deepEqual(parseCsv('name,city\n"Rao, Anil",Pune'), [
    ["name", "city"],
    ["Rao, Anil", "Pune"],
  ]);
});

void test("a doubled quote inside a quoted field is one literal quote", () => {
  assert.deepEqual(parseCsv('note\n"she said ""yes"""'), [["note"], ['she said "yes"']]);
});

void test("a newline inside a quoted field does not start a new row", () => {
  assert.deepEqual(parseCsv('name,notes\nAnil,"line one\nline two"'), [
    ["name", "notes"],
    ["Anil", "line one\nline two"],
  ]);
});

void test("a CRLF file with a BOM parses as if it had neither", () => {
  assert.deepEqual(parseCsv("﻿name,phone\r\nAnil,9876543210\r\n"), [
    ["name", "phone"],
    ["Anil", "9876543210"],
  ]);
});

void test("a bare quote mid-value stays literal instead of swallowing the file", () => {
  assert.deepEqual(parseCsv('a,b\nFlat 3" wide,x'), [
    ["a", "b"],
    ['Flat 3" wide', "x"],
  ]);
});

void test("a trailing newline adds no empty row, and a missing one loses no row", () => {
  assert.deepEqual(parseCsv("a\n1\n"), [["a"], ["1"]]);
  assert.deepEqual(parseCsv("a\n1"), [["a"], ["1"]]);
});

void test("header aliases resolve case- and space-insensitively", () => {
  assert.deepEqual(mapHeader([" Full Name ", "MOBILE", "Remarks", "unknown"], callTaskCsvColumns), {
    name: 0,
    phone: 1,
    notes: 2,
  });
});

void test("a header missing a required column reports it as absent", () => {
  assert.equal(mapHeader(["name", "city"], callTaskCsvColumns).phone, undefined);
});

void test("a quote that never closes is refused rather than merging records", () => {
  // Left to run, this swallows every following line into one field and the file
  // imports with prospects silently missing.
  assert.throws(
    () => parseCsv('name,phone\n"Anil,9876543210\nBob,9812345678'),
    UnbalancedQuoteError,
  );
});

void test("both spellings of remark resolve to the same optional column", () => {
  assert.equal(mapHeader(["name", "phone", "Remark"], callTaskCsvColumns).notes, 2);
  assert.equal(mapHeader(["name", "phone", "REMARKS"], callTaskCsvColumns).notes, 2);
  assert.equal(mapHeader(["name", "phone", "Notes"], callTaskCsvColumns).notes, 2);
  // Still genuinely optional — absence is not an error.
  assert.equal(mapHeader(["name", "phone"], callTaskCsvColumns).notes, undefined);
});
