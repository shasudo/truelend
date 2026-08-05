import assert from "node:assert/strict";
import test from "node:test";
import { deriveBankLeadStatus } from "../lib/bank-lead-status";

void test("deriveBankLeadStatus: recognizes rejected, disbursed/issued and approved statuses", () => {
  assert.equal(deriveBankLeadStatus({ status: "Rejected" }), "rejected");
  assert.equal(deriveBankLeadStatus({ status: "Application Declined" }), "rejected");
  assert.equal(deriveBankLeadStatus({ status: "Disbursed" }), "card_issued");
  assert.equal(deriveBankLeadStatus({ status: "Card Issued" }), "card_issued");
  assert.equal(deriveBankLeadStatus({ status: "APPROVED" }), "approved");
});

void test("deriveBankLeadStatus: an in-flight or unrecognized status defaults to in_progress", () => {
  assert.equal(deriveBankLeadStatus({ status: "IN PROGRESS" }), "in_progress");
  assert.equal(deriveBankLeadStatus({ status: "" }), "in_progress");
  assert.equal(deriveBankLeadStatus({}), "in_progress");
  assert.equal(deriveBankLeadStatus({ status: "Something New From The Bank" }), "in_progress");
});
