import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSafeInteger, paiseToRupeesInput, rupeesToPaise } from "../src/format";

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
