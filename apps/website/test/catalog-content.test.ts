import assert from "node:assert/strict";
import test from "node:test";
import { products as productReferences } from "@truelend/reference";
import { publicContentApproval } from "../content/approval";
import { catalogFallbackOnlyKeys, contentFor } from "../content/catalog/content";
import { products as productContent } from "../content/products";

void test("catalog content is schema-valid and taxonomy-complete", () => {
  assert.equal(contentFor("credit-card", "hdfc-swiggy")?.partial, false);
  assert.equal(contentFor("not-a-category", "not-an-item"), null);
  assert.deepEqual([...catalogFallbackOnlyKeys].sort(), [
    "business-loan/documents",
    "business-loan/eligibility",
    "business-loan/interest-rates",
    "home-loan/documents",
    "home-loan/eligibility",
    "personal-loan/documents",
    "personal-loan/eligibility",
  ]);
});

void test("rich product content covers the canonical product reference exactly", () => {
  assert.deepEqual(
    productContent.map(({ slug, name, shortName }) => ({ slug, name, shortName })),
    productReferences.map(({ slug, name, shortName }) => ({ slug, name, shortName })),
  );
});

void test("public content cannot be marked approved without named evidence", () => {
  if (publicContentApproval.status === "blocked") {
    assert.ok(publicContentApproval.blockedAreas.length > 0);
    return;
  }
  assert.ok(publicContentApproval.owner.trim().length > 0);
  assert.match(publicContentApproval.source, /^https?:\/\//);
  assert.match(publicContentApproval.reviewedAt, /^\d{4}-\d{2}-\d{2}$/);
});
