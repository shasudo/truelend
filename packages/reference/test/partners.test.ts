import assert from "node:assert/strict";
import test from "node:test";
import { referralTypeLabel, referralTypeOptions, referralTypeValues } from "../src/partners";

void test("referral types expose matching form values and readable labels", () => {
  assert.deepEqual(
    referralTypeValues,
    referralTypeOptions.map((option) => option.value),
  );
  assert.equal(referralTypeLabel("real_estate_professional"), "Real Estate Professional");
  assert.equal(referralTypeLabel("builder_developer"), "Builder / Developer");
  assert.equal(referralTypeLabel(null), "—");
});
