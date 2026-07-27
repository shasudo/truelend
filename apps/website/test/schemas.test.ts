import assert from "node:assert/strict";
import test from "node:test";
import {
  cibilNotifySchema,
  contactSchema,
  enquirySchema,
  enquiryFormSchema,
  leadSchema,
  referralSchema,
} from "../lib/lead-schemas";

const validEnquiry = {
  kind: "enquiry",
  name: "Asha Rao",
  phone: "9876543210",
  email: "asha@example.com",
  city: "Bengaluru",
  productSlug: "home-loan",
  loanAmount: "2500000",
  loanPurpose: "Home Purchase",
  employmentType: "salaried",
  employerName: "Acme Corp",
  monthlyIncome: "80000",
  experienceYears: "5",
  pincode: "560001",
  consent: true,
};

void test("enquiry form enforces the loan-application core for loans", () => {
  assert.equal(enquiryFormSchema.safeParse(validEnquiry).success, true);
  assert.equal(enquiryFormSchema.safeParse({ ...validEnquiry, loanAmount: "" }).success, false);
  assert.equal(enquiryFormSchema.safeParse({ ...validEnquiry, employmentType: "" }).success, false);
  assert.equal(enquiryFormSchema.safeParse({ ...validEnquiry, productSlug: "" }).success, false);
  assert.equal(enquiryFormSchema.safeParse({ ...validEnquiry, pincode: "56" }).success, false);
  assert.equal(
    enquiryFormSchema.safeParse({ ...validEnquiry, loanAmount: "25 lakh" }).success,
    false,
  );
  // Fields promoted to required by the assessment form redesign.
  assert.equal(enquiryFormSchema.safeParse({ ...validEnquiry, email: "" }).success, false);
  assert.equal(enquiryFormSchema.safeParse({ ...validEnquiry, city: "" }).success, false);
  assert.equal(enquiryFormSchema.safeParse({ ...validEnquiry, loanPurpose: "" }).success, false);
  assert.equal(enquiryFormSchema.safeParse({ ...validEnquiry, employerName: "" }).success, false);
  assert.equal(
    enquiryFormSchema.safeParse({ ...validEnquiry, experienceYears: "" }).success,
    false,
  );
});

void test("credit-card enquiry needs no loan amount", () => {
  const card = { ...validEnquiry, productSlug: "credit-cards", loanAmount: "" };
  // Card is valid without a loan amount at the form layer...
  assert.equal(enquiryFormSchema.safeParse(card).success, true);
  // ...and the server union accepts it too.
  assert.equal(enquirySchema.safeParse(card).success, true);
  // but still requires the fields a card issuer needs.
  assert.equal(enquiryFormSchema.safeParse({ ...card, monthlyIncome: "" }).success, false);
});

void test("server lead schema requires a loan amount for non-card enquiries", () => {
  assert.equal(enquirySchema.safeParse({ ...validEnquiry, loanAmount: "" }).success, true);
  assert.equal(leadSchema.safeParse({ ...validEnquiry, loanAmount: "" }).success, false);
  assert.equal(leadSchema.safeParse({ ...validEnquiry, loanAmount: undefined }).success, false);
  assert.equal(
    leadSchema.safeParse({ ...validEnquiry, productSlug: "credit-cards", loanAmount: "" }).success,
    true,
  );
  assert.equal(
    leadSchema.safeParse({
      ...validEnquiry,
      productSlug: "credit-cards",
      loanAmount: undefined,
    }).success,
    true,
  );
  // a malformed amount is still rejected when present
  assert.equal(leadSchema.safeParse({ ...validEnquiry, loanAmount: "abc" }).success, false);
});

void test("server schemas reject values beyond database integer bounds", () => {
  assert.equal(leadSchema.safeParse({ ...validEnquiry, tenureMonths: "600" }).success, true);
  assert.equal(leadSchema.safeParse({ ...validEnquiry, tenureMonths: "601" }).success, false);
  assert.equal(leadSchema.safeParse({ ...validEnquiry, experienceYears: "100" }).success, true);
  assert.equal(leadSchema.safeParse({ ...validEnquiry, experienceYears: "101" }).success, false);
});

void test("referral keeps loan detail optional but still validates when given", () => {
  const r = {
    kind: "referral",
    referrerName: "Asha Rao",
    referrerPhone: "9876543210",
    name: "Ravi Kumar",
    phone: "9812345678",
    consent: true,
  };
  assert.equal(referralSchema.safeParse(r).success, true);
  assert.equal(leadSchema.safeParse(r).success, true);
  assert.equal(referralSchema.safeParse({ ...r, loanAmount: "abc" }).success, false);
  assert.equal(referralSchema.safeParse({ ...r, loanAmount: "500000" }).success, true);
  assert.equal(referralSchema.safeParse({ ...r, tenureMonths: "600" }).success, true);
  assert.equal(referralSchema.safeParse({ ...r, tenureMonths: "601" }).success, false);
  assert.equal(leadSchema.safeParse({ ...r, tenureMonths: "601" }).success, false);
  assert.equal(referralSchema.safeParse({ ...r, experienceYears: "100" }).success, true);
  assert.equal(referralSchema.safeParse({ ...r, experienceYears: "101" }).success, false);
  assert.equal(leadSchema.safeParse({ ...r, experienceYears: "101" }).success, false);
});

void test("contact requires an enquiry type, email and bounded message", () => {
  const contact = {
    kind: "contact",
    reason: "borrowing_advice",
    name: "Asha Rao",
    phone: "9876543210",
    email: "asha@example.com",
    subject: "Home loan",
    message: "Please help me compare suitable home loan options.",
    consent: true,
  };

  assert.equal(contactSchema.safeParse(contact).success, true);
  assert.equal(leadSchema.safeParse(contact).success, true);
  assert.equal(contactSchema.safeParse({ ...contact, reason: "" }).success, false);
  assert.equal(contactSchema.safeParse({ ...contact, email: "" }).success, false);
  assert.equal(contactSchema.safeParse({ ...contact, message: "Too short" }).success, false);
  assert.equal(contactSchema.safeParse({ ...contact, message: "x".repeat(1001) }).success, false);
});

void test("CIBIL notification requires a valid email and explicit consent", () => {
  const notification = {
    kind: "cibil_notify",
    email: "asha@example.com",
    consent: true,
  };

  assert.equal(cibilNotifySchema.safeParse(notification).success, true);
  assert.equal(leadSchema.safeParse(notification).success, true);
  assert.equal(
    cibilNotifySchema.safeParse({ ...notification, email: "not-an-email" }).success,
    false,
  );
  assert.equal(cibilNotifySchema.safeParse({ ...notification, consent: false }).success, false);
});
