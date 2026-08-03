import assert from "node:assert/strict";
import test from "node:test";
import { createFormControl, type DefaultValues, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { withLeadKind } from "../lib/lead-resolver";
import {
  cibilNotifySchema,
  contactSchema,
  enquiryFormSchema,
  leadSchema,
  referralSchema,
} from "../lib/lead-schemas";

/** Every lead form is keyed off `kind`, so the cases share one loose shape. */
type LeadValues = Record<string, unknown> & { kind: string };
interface FormCase {
  resolver: Resolver<LeadValues>;
  defaults: DefaultValues<LeadValues> & { kind: string };
  filled: Record<string, unknown>;
}

/** Each form's defaults, and the values a user completing it correctly leaves. */
const forms: FormCase[] = [
  {
    resolver: zodResolver(enquiryFormSchema) as unknown as Resolver<LeadValues>,
    defaults: {
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
    },
    filled: {
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
    },
  },
  {
    resolver: zodResolver(referralSchema) as unknown as Resolver<LeadValues>,
    defaults: {
      kind: "referral",
      referrerName: "",
      referrerPhone: "",
      name: "",
      phone: "",
      consent: false,
    },
    filled: {
      referrerName: "Ravi Kumar",
      referrerPhone: "9876543211",
      name: "Asha Rao",
      phone: "9876543210",
      consent: true,
    },
  },
  {
    resolver: zodResolver(contactSchema) as unknown as Resolver<LeadValues>,
    defaults: {
      kind: "contact",
      reason: "",
      name: "",
      phone: "",
      email: "",
      message: "",
      consent: false,
    },
    filled: {
      reason: "borrowing_advice",
      name: "Asha Rao",
      phone: "9876543210",
      email: "asha@example.com",
      message: "I would like advice on a home loan.",
      consent: true,
    },
  },
  {
    resolver: zodResolver(cibilNotifySchema) as unknown as Resolver<LeadValues>,
    defaults: { kind: "cibil_notify", email: "", consent: false },
    filled: { email: "asha@example.com", consent: true },
  },
];

for (const { resolver, defaults, filled } of forms) {
  void test(`${defaults.kind}: a correctly completed form reaches the server action`, async () => {
    // Mirrors useLeadForm: shouldUnregister, and only fields with an input are
    // registered — `kind` has none, so react-hook-form never yields it.
    const { formControl } = createFormControl({
      shouldUnregister: true,
      resolver: withLeadKind(resolver, defaults),
      defaultValues: defaults,
    });
    for (const [field, value] of Object.entries(filled)) {
      formControl.register(field);
      formControl.setValue(field, value);
    }

    let submitted: Record<string, unknown> | undefined;
    await formControl.handleSubmit((values) => {
      submitted = values;
    })();

    // Without withLeadKind this never runs: validation fails on `kind`, and no
    // form renders that error, so the button silently does nothing.
    assert.ok(submitted, "the submit handler did not run — the form is dead on submit");

    const parsed = leadSchema.parse({ ...submitted, turnstileToken: "t" });
    assert.equal(parsed.kind, defaults.kind);
  });
}
