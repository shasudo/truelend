import assert from "node:assert/strict";
import test from "node:test";
import { assertPartnerRegistrationSchemaReady } from "../src/client";

void test("Referral Partner registration readiness accepts the migrated schema", () => {
  assert.doesNotThrow(() =>
    assertPartnerRegistrationSchemaReady({
      requiredColumnCount: "3",
      referenceSequence: "partners_reference_seq",
    }),
  );
});

void test("Referral Partner registration readiness rejects incomplete schema shapes", () => {
  const incompleteProbes = [
    undefined,
    { requiredColumnCount: "2", referenceSequence: "partners_reference_seq" },
    { requiredColumnCount: "3", referenceSequence: null },
  ];

  for (const probe of incompleteProbes) {
    assert.throws(
      () => assertPartnerRegistrationSchemaReady(probe),
      /registration schema is not ready/,
    );
  }
});
