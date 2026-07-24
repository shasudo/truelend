import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluatePartnerApplication,
  isApplicationComplete,
  isKycEditable,
  type PartnerApplicationData,
  type PartnerApplicationField,
  type PartnerReviewState,
} from "../src/partner-review";

const allRequiredDocuments = new Set(["pan", "aadhaar", "photo", "cheque"]);

const commonApplication = {
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

const referralApplication: PartnerApplicationData = {
  ...commonApplication,
  occupation: "Teacher",
  designation: "Senior",
};

void test("KYC is editable only before review or while correcting a rejection", () => {
  const cases: Array<[PartnerReviewState, boolean]> = [
    [{ status: "pending", submittedAt: null }, true],
    [{ status: "pending", submittedAt: new Date() }, false],
    [{ status: "rejected", submittedAt: null }, true],
    [{ status: "rejected", submittedAt: new Date() }, true],
    [{ status: "verified", submittedAt: null }, false],
    [{ status: "verified", submittedAt: new Date() }, false],
  ];

  for (const [state, expected] of cases) assert.equal(isKycEditable(state), expected);
});

void test("application completeness requires every common field and mandatory document", () => {
  const commonFields: PartnerApplicationField[] = [
    "pan",
    "address",
    "bankName",
    "accountHolder",
    "accountNumber",
    "bankBranch",
    "ifsc",
    "nomineeName",
    "nomineeAadhaar",
    "nomineePhone",
  ];

  assert.equal(isApplicationComplete(referralApplication, allRequiredDocuments), true);

  for (const field of commonFields) {
    const incomplete = { ...referralApplication, [field]: null };
    assert.equal(isApplicationComplete(incomplete, allRequiredDocuments), false, field);
  }

  assert.deepEqual(
    evaluatePartnerApplication(
      { ...referralApplication, status: "pending", submittedAt: null },
      new Set(["pan", "aadhaar", "photo"]),
    ).missingDocumentTypes,
    ["cheque"],
  );
});

void test("referral occupation and designation are required", () => {
  assert.equal(
    isApplicationComplete({ ...referralApplication, occupation: "   " }, allRequiredDocuments),
    false,
  );
  assert.equal(
    isApplicationComplete({ ...referralApplication, designation: null }, allRequiredDocuments),
    false,
  );
});

void test("submission and approval permissions follow the review state", () => {
  const draft = evaluatePartnerApplication(
    { ...referralApplication, status: "pending", submittedAt: null },
    allRequiredDocuments,
  );
  assert.deepEqual(
    { editable: draft.isKycEditable, submit: draft.canSubmit, approve: draft.canApprove },
    { editable: true, submit: true, approve: false },
  );

  const submitted = evaluatePartnerApplication(
    { ...referralApplication, status: "pending", submittedAt: new Date() },
    allRequiredDocuments,
  );
  assert.deepEqual(
    {
      editable: submitted.isKycEditable,
      submit: submitted.canSubmit,
      approve: submitted.canApprove,
    },
    { editable: false, submit: false, approve: true },
  );

  const rejected = evaluatePartnerApplication(
    { ...referralApplication, status: "rejected", submittedAt: new Date() },
    allRequiredDocuments,
  );
  assert.deepEqual(
    {
      editable: rejected.isKycEditable,
      submit: rejected.canSubmit,
      approve: rejected.canApprove,
    },
    { editable: true, submit: true, approve: false },
  );

  const verified = evaluatePartnerApplication(
    { ...referralApplication, status: "verified", submittedAt: new Date() },
    allRequiredDocuments,
  );
  assert.deepEqual(
    {
      editable: verified.isKycEditable,
      submit: verified.canSubmit,
      approve: verified.canApprove,
    },
    { editable: false, submit: false, approve: false },
  );
});

void test("an incomplete submitted application cannot be approved", () => {
  const evaluation = evaluatePartnerApplication(
    {
      ...referralApplication,
      bankName: null,
      designation: null,
      status: "pending",
      submittedAt: new Date(),
    },
    new Set(["pan", "aadhaar"]),
  );

  assert.equal(evaluation.isComplete, false);
  assert.equal(evaluation.canApprove, false);
  assert.deepEqual(evaluation.missingFields, ["bankName", "designation"]);
  assert.deepEqual(evaluation.missingDocumentTypes, ["photo", "cheque"]);
});
