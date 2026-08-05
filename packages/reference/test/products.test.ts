import assert from "node:assert/strict";
import test from "node:test";
import { resolveProductSlug } from "../src/products";

void test("resolveProductSlug accepts the exact slug", () => {
  assert.equal(resolveProductSlug("personal-loan"), "personal-loan");
  assert.equal(resolveProductSlug(" home-loan "), "home-loan");
});

void test("resolveProductSlug accepts a human label a spreadsheet actually contains", () => {
  assert.equal(resolveProductSlug("Personal Loan"), "personal-loan");
  assert.equal(resolveProductSlug("personal loan"), "personal-loan");
  assert.equal(resolveProductSlug("Loan Against Property"), "loan-against-property");
  assert.equal(resolveProductSlug("Credit Cards"), "credit-cards");
});

void test("resolveProductSlug rejects blank or unrecognized text", () => {
  assert.equal(resolveProductSlug(""), null);
  assert.equal(resolveProductSlug("   "), null);
  assert.equal(resolveProductSlug("Something Else"), null);
});
