import assert from "node:assert/strict";
import test from "node:test";
import {
  changedPartnerReviewFields,
  partnerRejectionRefusal,
  partnerReviewSensitiveFields,
} from "../lib/partner-review-policy";

function reviewValues() {
  return {
    occupation: "Advisor",
    designation: "Principal",
    pan: "ABCDE1234F",
    address: "1 Test Street",
    bankName: "Test Bank",
    accountHolder: "Test Partner",
    accountNumber: "123456789",
    bankBranch: "Main",
    ifsc: "TEST0001234",
    nomineeName: "Nominee",
    nomineeAadhaar: null,
    nomineePhone: "9876543210",
  };
}

void test("every approval-sensitive field resets a verified review when changed", () => {
  const before = reviewValues();

  for (const field of partnerReviewSensitiveFields) {
    const after = { ...before, [field]: `${String(before[field])}-changed` };
    assert.deepEqual(changedPartnerReviewFields(before, after), [field]);
  }
  assert.deepEqual(changedPartnerReviewFields(before, { ...before }), []);
});

void test("only a submitted pending application can be rejected", () => {
  assert.equal(
    partnerRejectionRefusal({ status: "pending", submittedAt: new Date("2026-01-01") }),
    null,
  );
  assert.match(
    partnerRejectionRefusal({ status: "pending", submittedAt: null }) ?? "",
    /not currently awaiting review/,
  );
  assert.match(
    partnerRejectionRefusal({ status: "rejected", submittedAt: new Date("2026-01-01") }) ?? "",
    /already been rejected/,
  );
  assert.match(
    partnerRejectionRefusal({ status: "verified", submittedAt: new Date("2026-01-01") }) ?? "",
    /already verified/,
  );
});
