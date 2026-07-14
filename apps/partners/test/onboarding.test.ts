import assert from "node:assert/strict";
import test from "node:test";
import { isApplicationComplete, kycEditable } from "../lib/onboarding";

test("KYC becomes immutable once submitted or verified", () => {
  assert.equal(kycEditable({ status: "pending", submittedAt: null }), true);
  assert.equal(kycEditable({ status: "rejected", submittedAt: new Date() }), true);
  assert.equal(kycEditable({ status: "pending", submittedAt: new Date() }), false);
  assert.equal(kycEditable({ status: "verified", submittedAt: null }), false);
});

const allDocs = new Set(["pan", "aadhaar", "photo", "cheque"]);

const common = {
  pan: "ABCDE1234F",
  address: "Full registered address",
  bankName: "HDFC Bank",
  accountHolder: "Test Partner",
  accountNumber: "123456789",
  bankBranch: "MG Road",
  ifsc: "HDFC0001234",
  nomineeName: "Nominee One",
  nomineeAadhaar: "123412341234",
  nomineePhone: "9876543210",
};

const businessPartner = {
  ...common,
  type: "business" as const,
  productsHandled: ["Loans"],
  yearsExperience: 5,
  monthlyVolumeLoansPaise: 100000,
  monthlyVolumeInsurancePaise: 0,
  monthlyVolumeMutualFundsPaise: 0,
  residenceAddress: "Home address",
  occupation: null,
  designation: null,
};

const referralPartner = {
  ...common,
  type: "referral" as const,
  productsHandled: null,
  yearsExperience: null,
  monthlyVolumeLoansPaise: null,
  monthlyVolumeInsurancePaise: null,
  monthlyVolumeMutualFundsPaise: null,
  residenceAddress: null,
  occupation: "Teacher",
  designation: "Senior",
};

test("application completeness requires details and every mandatory document", () => {
  assert.equal(isApplicationComplete(businessPartner, allDocs), true);
  assert.equal(isApplicationComplete(referralPartner, allDocs), true);
  // missing the cancelled cheque
  assert.equal(isApplicationComplete(businessPartner, new Set(["pan", "aadhaar", "photo"])), false);
});

test("completeness enforces the fields each partner type must supply", () => {
  // a business partner without their monthly volumes is incomplete
  assert.equal(
    isApplicationComplete({ ...businessPartner, monthlyVolumeLoansPaise: null }, allDocs),
    false,
  );
  // a referral partner missing occupation/designation is incomplete
  assert.equal(isApplicationComplete({ ...referralPartner, designation: null }, allDocs), false);
  // nominee details are required for both types
  assert.equal(isApplicationComplete({ ...businessPartner, nomineePhone: null }, allDocs), false);
  assert.equal(isApplicationComplete({ ...referralPartner, bankName: null }, allDocs), false);
});
