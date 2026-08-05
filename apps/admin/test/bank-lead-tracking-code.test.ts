import assert from "node:assert/strict";
import test from "node:test";
import { extractTrackingCode } from "../lib/bank-lead-tracking-code";

void test("extractTrackingCode: extracts the 8 digits from a well-formed value", () => {
  assert.equal(extractTrackingCode("TRUE12345678"), "12345678");
  assert.equal(extractTrackingCode(" true87654321 "), "87654321");
});

void test("extractTrackingCode: rejects codes from other agents/DSAs or the wrong shape", () => {
  assert.equal(extractTrackingCode("ORG"), undefined);
  assert.equal(extractTrackingCode("NSSH31"), undefined);
  assert.equal(extractTrackingCode("TRUE1234567"), undefined);
  assert.equal(extractTrackingCode("TRUE123456789"), undefined);
  assert.equal(extractTrackingCode("TRUEabcdefgh"), undefined);
  assert.equal(extractTrackingCode(""), undefined);
});
