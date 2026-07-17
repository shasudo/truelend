import assert from "node:assert/strict";
import test from "node:test";
import { preselectedProduct } from "../lib/preselected-product";

test("a real product slug preselects the form", () => {
  assert.equal(preselectedProduct("home-loan"), "home-loan");
  assert.equal(preselectedProduct("credit-cards"), "credit-cards");
});

test("anything not a known slug falls back to no selection", () => {
  assert.equal(preselectedProduct(undefined), "");
  assert.equal(preselectedProduct(""), "");
  assert.equal(preselectedProduct("not-a-product"), "");
  // ?product=home-loan&product=x arrives as an array — only the first is read,
  // and it still has to be a real slug.
  assert.equal(preselectedProduct(["home-loan", "x"]), "home-loan");
  assert.equal(preselectedProduct(["../../etc/passwd"]), "");
  assert.equal(preselectedProduct([]), "");
});
