import assert from "node:assert/strict";
import test from "node:test";
import { paiseToRupeesInput, rupeesToPaise } from "../src/format";

test("money conversion accepts formatted input and never emits unsafe integers", () => {
  assert.equal(rupeesToPaise("₹1,25,000.50"), 12_500_050);
  assert.equal(rupeesToPaise(""), null);
  assert.equal(rupeesToPaise("-1"), null);
  assert.equal(rupeesToPaise("not money"), null);
  assert.equal(rupeesToPaise(String(Number.MAX_SAFE_INTEGER)), null);
  assert.equal(paiseToRupeesInput(12_345), "123.45");
});
