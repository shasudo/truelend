import assert from "node:assert/strict";
import test from "node:test";

import { hasConfiguredValues } from "../src/index";

void test("hasConfiguredValues accepts only non-empty runtime strings", () => {
  assert.equal(hasConfiguredValues("secret", " https://example.test "), true);
  assert.equal(hasConfiguredValues("secret", ""), false);
  assert.equal(hasConfiguredValues("secret", "   "), false);
  assert.equal(hasConfiguredValues("secret", undefined), false);
  assert.equal(hasConfiguredValues("secret", 1), false);
});
