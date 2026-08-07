import assert from "node:assert/strict";
import test from "node:test";
import { istDaysBetween, resolveRange } from "../lib/date-range";

/*
 * The boundaries, not the labels. Every activity number on the overview is
 * counted over [from, to), so an hour of drift here silently moves leads between
 * days on a page people report from — and a UTC-shaped bug only shows up for the
 * first 5.5 hours of an Indian day, which is exactly when nobody is looking.
 *
 * 2026-08-07T02:00:00Z is 07:30 IST on the 7th. 2026-08-06T20:00:00Z is 01:30
 * IST on the 7th — the same IST day, but the previous UTC one.
 */
const MORNING_IST = new Date("2026-08-07T02:00:00Z");
const AFTER_MIDNIGHT_IST = new Date("2026-08-06T20:00:00Z");

void test("today is the IST calendar day, not the UTC one", () => {
  const range = resolveRange({ range: "today" }, MORNING_IST);
  assert.equal(range.from.toISOString(), "2026-08-06T18:30:00.000Z");
  assert.equal(range.to.toISOString(), "2026-08-07T18:30:00.000Z");
  assert.equal(range.fromDay, "2026-08-07");
  assert.equal(range.toDay, "2026-08-07");
});

void test("just after IST midnight still resolves to the new IST day", () => {
  const range = resolveRange({ range: "today" }, AFTER_MIDNIGHT_IST);
  // Not the 5th: at 01:30 IST the UTC date is still the 6th, and reading it
  // would report a whole day of stale numbers to anyone working early.
  assert.equal(range.fromDay, "2026-08-07");
  assert.ok(range.from <= AFTER_MIDNIGHT_IST && AFTER_MIDNIGHT_IST < range.to);
});

void test("yesterday ends where today begins, with no gap and no overlap", () => {
  const today = resolveRange({ range: "today" }, MORNING_IST);
  const yesterday = resolveRange({ range: "yesterday" }, MORNING_IST);
  assert.equal(yesterday.to.getTime(), today.from.getTime());
  assert.equal(yesterday.fromDay, "2026-08-06");
  assert.equal(yesterday.toDay, "2026-08-06");
});

void test("rolling windows count whole IST days, today included", () => {
  const week = resolveRange({ range: "7d" }, MORNING_IST);
  assert.equal(week.fromDay, "2026-08-01", "seven days means the 1st through the 7th");
  assert.equal(week.toDay, "2026-08-07");
  const month = resolveRange({ range: "30d" }, MORNING_IST);
  assert.equal(month.fromDay, "2026-07-09");
  assert.equal(month.toDay, "2026-08-07");
});

void test("all time starts at the epoch so no query needs a conditional clause", () => {
  const range = resolveRange({ range: "all" }, MORNING_IST);
  assert.equal(range.from.getTime(), 0);
  assert.equal(range.to.toISOString(), "2026-08-07T18:30:00.000Z");
});

void test("an explicit range covers both end days inclusively", () => {
  const range = resolveRange({ from: "2026-08-01", to: "2026-08-03" }, MORNING_IST);
  assert.equal(range.key, "custom");
  assert.equal(range.from.toISOString(), "2026-07-31T18:30:00.000Z");
  // Exclusive bound on the START of the 4th, so the 3rd is itself included
  // rather than truncated at midnight.
  assert.equal(range.to.toISOString(), "2026-08-03T18:30:00.000Z");
});

void test("explicit dates win over a stale preset riding along in the URL", () => {
  const range = resolveRange({ range: "30d", from: "2026-08-02", to: "2026-08-02" }, MORNING_IST);
  assert.equal(range.key, "custom");
  assert.equal(range.fromDay, "2026-08-02");
  assert.equal(range.toDay, "2026-08-02");
});

void test("a backwards range is read the way it was meant, not as nothing", () => {
  const range = resolveRange({ from: "2026-08-05", to: "2026-08-01" }, MORNING_IST);
  assert.equal(range.fromDay, "2026-08-01");
  assert.equal(range.toDay, "2026-08-05");
  assert.ok(range.from < range.to);
});

void test("half a custom range is completed rather than discarded", () => {
  const range = resolveRange({ from: "2026-08-02" }, MORNING_IST);
  assert.equal(range.key, "custom");
  assert.equal(range.fromDay, "2026-08-02");
  assert.equal(range.toDay, "2026-08-02");
});

void test("junk falls back to today rather than becoming an Invalid Date", () => {
  for (const input of [{}, { range: "last-tuesday" }, { from: "07/08/2026" }, { to: "" }]) {
    const range = resolveRange(input, MORNING_IST);
    assert.equal(range.key, "today", `${JSON.stringify(input)} should fall back`);
    assert.ok(!Number.isNaN(range.from.getTime()));
    assert.ok(!Number.isNaN(range.to.getTime()));
  }
});

/*
 * The day axis the caller timeline is drawn against. It has to line up exactly
 * with the range the same page filtered by, or a column of calls lands under the
 * wrong date — which is worse than showing nothing, because it looks right.
 */
void test("the day axis covers exactly the days in the range", () => {
  const week = resolveRange({ range: "7d" }, MORNING_IST);
  assert.deepEqual(istDaysBetween(week.from, week.to), [
    "2026-08-01",
    "2026-08-02",
    "2026-08-03",
    "2026-08-04",
    "2026-08-05",
    "2026-08-06",
    "2026-08-07",
  ]);
});

void test("a single-day range is a single column, not an empty axis", () => {
  const today = resolveRange({ range: "today" }, MORNING_IST);
  assert.deepEqual(istDaysBetween(today.from, today.to), ["2026-08-07"]);
  const yesterday = resolveRange({ range: "yesterday" }, MORNING_IST);
  assert.deepEqual(istDaysBetween(yesterday.from, yesterday.to), ["2026-08-06"]);
});

void test("all time is capped to the most recent days rather than reaching the epoch", () => {
  const all = resolveRange({ range: "all" }, MORNING_IST);
  const days = istDaysBetween(all.from, all.to);
  assert.equal(days.length, 30, "an uncapped axis would be twenty thousand columns wide");
  assert.equal(days.at(-1), "2026-08-07", "the cap keeps the most recent days, not the oldest");
  assert.equal(days[0], "2026-07-09");
});

void test("the axis stays ascending and gap-free at any cap", () => {
  const range = resolveRange({ range: "30d" }, MORNING_IST);
  const days = istDaysBetween(range.from, range.to, 5);
  assert.deepEqual(days, ["2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07"]);
});
