import assert from "node:assert/strict";
import test from "node:test";
import { paiseToRupeesInput, rupeesToPaise } from "../packages/reference/src/format.ts";
import { isApplicationComplete, kycEditable } from "../apps/partners/lib/onboarding.ts";

test("rupeesToPaise accepts formatted input and never emits unsafe integers", () => {
  assert.equal(rupeesToPaise("₹1,25,000.50"), 12_500_050);
  assert.equal(rupeesToPaise(""), null);
  assert.equal(rupeesToPaise("-1"), null);
  assert.equal(rupeesToPaise("not money"), null);
  assert.equal(rupeesToPaise(String(Number.MAX_SAFE_INTEGER)), null);
  assert.equal(paiseToRupeesInput(12_345), "123.45");
});

test("KYC becomes immutable once submitted or verified", () => {
  assert.equal(kycEditable({ status: "pending", submittedAt: null }), true);
  assert.equal(kycEditable({ status: "rejected", submittedAt: new Date() }), true);
  assert.equal(kycEditable({ status: "pending", submittedAt: new Date() }), false);
  assert.equal(kycEditable({ status: "verified", submittedAt: null }), false);
});

test("application completeness requires details and every mandatory document", () => {
  const completeDetails = {
    pan: "ABCDE1234F",
    address: "Full registered address",
    accountHolder: "Test Partner",
    accountNumber: "123456789",
    ifsc: "HDFC0001234",
  };
  assert.equal(
    isApplicationComplete(completeDetails, new Set(["pan", "aadhaar", "photo", "cheque"])),
    true,
  );
  assert.equal(isApplicationComplete(completeDetails, new Set(["pan", "aadhaar", "photo"])), false);
  assert.equal(
    isApplicationComplete(
      { ...completeDetails, accountHolder: null },
      new Set(["pan", "aadhaar", "photo", "cheque"]),
    ),
    false,
  );
});
