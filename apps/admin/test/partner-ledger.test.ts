import assert from "node:assert/strict";
import test from "node:test";
import { normalizePartnerLedger } from "../lib/partner-ledger";

void test("normalizes postgres aggregate strings without losing paise", () => {
  assert.deepEqual(normalizePartnerLedger("12500", "2500"), {
    earnedPaise: 12500,
    paidPaise: 2500,
    outstandingPaise: 10000,
  });
});

void test("treats missing ledger aggregates as zero", () => {
  assert.deepEqual(normalizePartnerLedger(undefined, null), {
    earnedPaise: 0,
    paidPaise: 0,
    outstandingPaise: 0,
  });
});

void test("rejects an aggregate above JavaScript's safe integer range", () => {
  assert.throws(
    () => normalizePartnerLedger("9007199254740992", "0"),
    /Partner earned total exceeds JavaScript's safe integer range/,
  );
});
