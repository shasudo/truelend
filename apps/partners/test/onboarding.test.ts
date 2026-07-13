import assert from "node:assert/strict";
import test from "node:test";
import { isApplicationComplete, kycEditable } from "../lib/onboarding";

test("KYC becomes immutable once submitted or verified", () => {
  assert.equal(kycEditable({ status: "pending", submittedAt: null }), true);
  assert.equal(kycEditable({ status: "rejected", submittedAt: new Date() }), true);
  assert.equal(kycEditable({ status: "pending", submittedAt: new Date() }), false);
  assert.equal(kycEditable({ status: "verified", submittedAt: null }), false);
});

test("application completeness requires details and every mandatory document", () => {
  const details = {
    pan: "ABCDE1234F",
    address: "Full registered address",
    accountHolder: "Test Partner",
    accountNumber: "123456789",
    ifsc: "HDFC0001234",
  };
  assert.equal(
    isApplicationComplete(details, new Set(["pan", "aadhaar", "photo", "cheque"])),
    true,
  );
  assert.equal(isApplicationComplete(details, new Set(["pan", "aadhaar", "photo"])), false);
});
