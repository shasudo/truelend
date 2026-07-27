import assert from "node:assert/strict";
import test from "node:test";

import { bestLoanCaseOutcome, channelForKind } from "../src/leads";

void test("referral-partner lead channels take precedence over the website lead kind", () => {
  assert.equal(channelForKind("referral", true), "Referral Partner");
  assert.equal(channelForKind("referral"), "Website · Referral");
  assert.equal(channelForKind("enquiry"), "Website · Direct");
});

void test("the best lender outcome controls a lead regardless of input order", () => {
  assert.equal(bestLoanCaseOutcome([]), null);
  assert.equal(bestLoanCaseOutcome(["declined"]), "declined");
  assert.equal(bestLoanCaseOutcome(["declined", "logged_in"]), "logged_in");
  assert.equal(bestLoanCaseOutcome(["approved", "declined"]), "approved");
  assert.equal(bestLoanCaseOutcome(["declined", "disbursed", "approved"]), "disbursed");
});
