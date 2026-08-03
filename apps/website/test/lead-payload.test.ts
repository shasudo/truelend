import assert from "node:assert/strict";
import test from "node:test";
import { createFormControl } from "react-hook-form";
import { leadPayload } from "../lib/lead-payload";
import { leadSchema } from "../lib/lead-schemas";

const enquiryDefaults = {
  kind: "enquiry",
  productSlug: "",
  loanAmount: "",
  loanPurpose: "",
  name: "",
  phone: "",
  email: "",
  city: "",
  pincode: "",
  employmentType: "",
  employerName: "",
  monthlyIncome: "",
  experienceYears: "",
  consent: false,
};

const typed = {
  productSlug: "home-loan",
  loanAmount: "2500000",
  loanPurpose: "Home Purchase",
  name: "Asha Rao",
  phone: "9876543210",
  email: "asha@example.com",
  city: "Bengaluru",
  pincode: "560001",
  employmentType: "salaried",
  employerName: "Acme Corp",
  monthlyIncome: "80000",
  experienceYears: "5",
  consent: true,
};

/** What useLeadForm does: shouldUnregister, and only real inputs are registered. */
async function submittedValues() {
  const { formControl } = createFormControl({
    shouldUnregister: true,
    defaultValues: enquiryDefaults,
  });
  for (const [field, value] of Object.entries(typed)) {
    formControl.register(field as keyof typeof enquiryDefaults);
    formControl.setValue(field as keyof typeof enquiryDefaults, value);
  }
  let values: Record<string, unknown> | undefined;
  await formControl.handleSubmit((v) => {
    values = v;
  })();
  assert.ok(values, "handleSubmit did not run");
  return values;
}

void test("the submitted payload keeps the discriminator the server union needs", async () => {
  const values = await submittedValues();

  // The trap this guards: `kind` has no input, so shouldUnregister drops it and
  // the raw form values alone fail every lead submission.
  assert.equal("kind" in values, false);
  assert.equal(leadSchema.safeParse({ ...values, turnstileToken: "t" }).success, false);

  const payload = leadPayload(
    enquiryDefaults,
    values as Omit<typeof enquiryDefaults, "kind">,
    { ref: "RP100019" },
    "t",
  );
  const parsed = leadSchema.parse(payload);
  assert.equal(parsed.kind, "enquiry");
  assert.equal(parsed.ref, "RP100019");
});
