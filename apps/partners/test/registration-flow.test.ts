import assert from "node:assert/strict";
import test from "node:test";
import {
  registrationAccountDecision,
  registrationErrorNeedsNewVerification,
  registrationErrorOffersAccountHelp,
  registrationStepForIssue,
  registrationValuesFromSubmission,
} from "../lib/registration-flow";

void test("only an unassigned account can create a partner profile", () => {
  assert.equal(registrationAccountDecision(null, false), "create");
  assert.equal(registrationAccountDecision("referral", true), "existing");
  assert.equal(registrationAccountDecision(undefined, false), "ineligible");
  assert.equal(registrationAccountDecision("admin", false), "ineligible");
  assert.equal(registrationAccountDecision("employee", false), "ineligible");
  assert.equal(registrationAccountDecision("partner_pending", false), "ineligible");
  assert.equal(registrationAccountDecision(null, true), "ineligible");
  assert.equal(registrationAccountDecision("referral", false), "ineligible");
});

void test("registration validation errors return users to the relevant step", () => {
  assert.equal(registrationStepForIssue(["name"]), 1);
  assert.equal(registrationStepForIssue(["dateOfBirth"]), 1);
  assert.equal(registrationStepForIssue(["phone"]), 2);
  assert.equal(registrationStepForIssue(["email"]), 2);
  assert.equal(registrationStepForIssue(["password"]), 2);
  assert.equal(registrationStepForIssue(["turnstileToken"]), 3);
  assert.equal(registrationStepForIssue([]), 1);
});

void test("registration errors preserve bounded form values but never credentials", () => {
  const values = registrationValuesFromSubmission(
    {
      name: "A".repeat(200),
      email: "person@example.com",
      password: "must-not-return",
      turnstileToken: "must-not-return",
      phone: "9876543210",
    },
    true,
  );
  assert.equal(values.name, "A".repeat(120));
  assert.equal(values.email, "person@example.com");
  assert.equal(values.phone, "9876543210");
  assert.equal("password" in values, false);
  assert.equal("turnstileToken" in values, false);

  const signedInValues = registrationValuesFromSubmission(
    { email: "untrusted@example.com", phone: "9876543210" },
    false,
  );
  assert.equal("email" in signedInValues, false);
});

void test("only consumed or failed verification challenges are refreshed", () => {
  assert.equal(registrationErrorNeedsNewVerification("invalid_input"), false);
  assert.equal(registrationErrorNeedsNewVerification("rate_limited"), false);
  assert.equal(registrationErrorNeedsNewVerification("account_conflict"), false);
  assert.equal(registrationErrorNeedsNewVerification("verification_failed"), true);
  assert.equal(registrationErrorNeedsNewVerification("registration_failed"), true);
  assert.equal(registrationErrorNeedsNewVerification("service_unavailable"), true);
});

void test("generic registration failures offer non-enumerating account recovery", () => {
  assert.equal(registrationErrorOffersAccountHelp("registration_failed"), true);
  assert.equal(registrationErrorOffersAccountHelp("invalid_input"), false);
  assert.equal(registrationErrorOffersAccountHelp("account_conflict"), false);
});
