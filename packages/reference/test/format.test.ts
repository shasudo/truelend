import assert from "node:assert/strict";
import test from "node:test";
import {
  formatDate,
  formatDateTime,
  normalizeSafeInteger,
  paiseToRupeesInput,
  rupeesToPaise,
} from "../src/format";

void test("money conversion accepts formatted input and never emits unsafe integers", () => {
  assert.equal(rupeesToPaise("₹1,25,000.50"), 12_500_050);
  assert.equal(rupeesToPaise(""), null);
  assert.equal(rupeesToPaise("-1"), null);
  assert.equal(rupeesToPaise("not money"), null);
  assert.equal(rupeesToPaise(String(Number.MAX_SAFE_INTEGER)), null);
  assert.equal(paiseToRupeesInput(12_345), "123.45");
});

void test("database aggregates reject invalid or unsafe integer values", () => {
  assert.equal(normalizeSafeInteger("12500050", "revenue"), 12_500_050);
  assert.equal(normalizeSafeInteger(null), 0);
  assert.throws(() => normalizeSafeInteger("9007199254740992", "revenue"), {
    name: "RangeError",
  });
  assert.throws(() => normalizeSafeInteger("1.5", "count"), { name: "RangeError" });
  assert.throws(() => normalizeSafeInteger("", "count"), { name: "TypeError" });
});

void test("dates render in IST regardless of the runtime's own time zone", () => {
  // 18:30 UTC is 00:00 the next day in IST. A Worker runs in UTC, so an
  // unpinned formatter would render the previous day here and disagree with
  // the same value formatted in an Indian browser.
  const lateEvening = new Date("2026-08-03T18:30:00Z");
  assert.equal(formatDate(lateEvening), "4 Aug 2026");
  assert.match(formatDateTime(lateEvening), /^4 Aug 2026, 12:00\s?am$/i);

  // And a mid-afternoon UTC instant stays on the same IST day, +5:30.
  const afternoon = new Date("2026-08-03T09:00:00Z");
  assert.equal(formatDate(afternoon), "3 Aug 2026");
  assert.match(formatDateTime(afternoon), /^3 Aug 2026, 2:30\s?pm$/i);
});
