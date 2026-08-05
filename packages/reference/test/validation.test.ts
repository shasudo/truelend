import assert from "node:assert/strict";
import test from "node:test";
import { normalizeIndianMobile, validationPatterns } from "../src/validation";

void test("normalizeIndianMobile strips the formats a real contact list actually carries", () => {
  assert.equal(normalizeIndianMobile("9876543210"), "9876543210");
  assert.equal(normalizeIndianMobile("+91 98765 43210"), "9876543210");
  assert.equal(normalizeIndianMobile("+91-98765-43210"), "9876543210");
  assert.equal(normalizeIndianMobile("91 9876543210"), "9876543210");
  assert.equal(normalizeIndianMobile("09876543210"), "9876543210");
  assert.equal(normalizeIndianMobile("(91) 98765-43210"), "9876543210");
});

void test("normalizeIndianMobile output always satisfies the indianMobile pattern for real numbers", () => {
  for (const input of ["9876543210", "+919876543210", "919876543210", "09876543210"]) {
    assert.match(normalizeIndianMobile(input), validationPatterns.indianMobile);
  }
});

void test("normalizeIndianMobile does not mangle a genuinely invalid number into a valid one", () => {
  // Too short even after stripping — must stay invalid, not get coerced.
  assert.doesNotMatch(normalizeIndianMobile("12345"), validationPatterns.indianMobile);
  // Letters strip to nothing useful; must not accidentally validate.
  assert.doesNotMatch(normalizeIndianMobile("call-me-maybe"), validationPatterns.indianMobile);
});
