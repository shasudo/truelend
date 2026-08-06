import assert from "node:assert/strict";
import test from "node:test";

import {
  bestLoanCaseOutcome,
  channelForKind,
  itrFiledLabel,
  itrFiledToBoolean,
} from "../src/leads";

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

void test("an unanswered ITR question stays null rather than becoming a 'no'", () => {
  assert.equal(itrFiledToBoolean("yes"), true);
  assert.equal(itrFiledToBoolean("no"), false);
  // Every way a form can arrive without an answer: untouched select, absent
  // field, or a column that predates the question.
  assert.equal(itrFiledToBoolean(""), null);
  assert.equal(itrFiledToBoolean(undefined), null);
  assert.equal(itrFiledToBoolean(null), null);
  // "does not file" and "nobody asked" are different lending profiles, and the
  // lead page must be able to show nothing at all for the second.
  assert.equal(itrFiledLabel(true), "Yes");
  assert.equal(itrFiledLabel(false), "No");
  assert.equal(itrFiledLabel(null), null);
  assert.equal(itrFiledLabel(undefined), null);
});
