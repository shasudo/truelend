import assert from "node:assert/strict";
import test from "node:test";
import { enquirySchema, referralSchema } from "../lib/schemas";

const validEnquiry = {
  kind: "enquiry",
  name: "Asha Rao",
  phone: "9876543210",
  productSlug: "home-loan",
  loanAmount: "2500000",
  employmentType: "salaried",
  monthlyIncome: "80000",
  pincode: "560001",
  consent: true,
};

test("enquiry enforces the loan-application core", () => {
  assert.equal(enquirySchema.safeParse(validEnquiry).success, true);
  assert.equal(enquirySchema.safeParse({ ...validEnquiry, loanAmount: "" }).success, false);
  assert.equal(enquirySchema.safeParse({ ...validEnquiry, employmentType: "" }).success, false);
  assert.equal(enquirySchema.safeParse({ ...validEnquiry, productSlug: "" }).success, false);
  assert.equal(enquirySchema.safeParse({ ...validEnquiry, pincode: "56" }).success, false);
  assert.equal(enquirySchema.safeParse({ ...validEnquiry, loanAmount: "25 lakh" }).success, false);
});

test("referral keeps loan detail optional but still validates when given", () => {
  const r = {
    kind: "referral",
    referrerName: "Asha Rao",
    referrerPhone: "9876543210",
    name: "Ravi Kumar",
    phone: "9812345678",
    consent: true,
  };
  assert.equal(referralSchema.safeParse(r).success, true);
  assert.equal(referralSchema.safeParse({ ...r, loanAmount: "abc" }).success, false);
  assert.equal(referralSchema.safeParse({ ...r, loanAmount: "500000" }).success, true);
});
