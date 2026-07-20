import { z } from "zod";
import {
  products,
  employmentTypeValues,
  residenceTypeValues,
  cardProducts,
} from "@truelend/reference";

const productSlugs = products.map((p) => p.slug) as [string, ...string[]];

/* Detailed loan-application fields. Amounts are rupee strings here (digits
 * only) and become integer paise at the server boundary via rupeesToPaise. */
const rupeeAmount = (label: string) =>
  z
    .string()
    .trim()
    .regex(/^\d{1,10}$/, `Enter ${label} in rupees (digits only)`);
const rupeeAmountOptional = z
  .string()
  .trim()
  .regex(/^\d{1,10}$/, "Enter the amount in rupees (digits only)")
  .or(z.literal(""))
  .optional();
const smallIntOptional = z
  .string()
  .trim()
  .regex(/^\d{1,3}$/, "Numbers only")
  .or(z.literal(""))
  .optional();
const pincode = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter a 6-digit PIN code");

// Required core on the self-application enquiry. Enums accept "" as input (the
// select's placeholder) but a refine rejects it, so the empty default still
// typechecks while an unmade choice fails validation with a clear message.
const loanCore = {
  loanAmount: rupeeAmount("the loan amount"),
  employmentType: z
    .enum(employmentTypeValues)
    .or(z.literal(""))
    .refine((v) => v !== "", { message: "Select your employment type" }),
  monthlyIncome: rupeeAmount("your monthly income"),
  pincode,
};
// Optional detail, shared by every detailed form.
const loanDetails = {
  tenureMonths: smallIntOptional,
  loanPurpose: z.string().trim().max(200).optional(),
  residenceType: z.enum(residenceTypeValues).or(z.literal("")).optional(),
  employerName: z.string().trim().max(160).optional(),
  experienceYears: smallIntOptional,
  existingEmi: rupeeAmountOptional,
  assetValue: rupeeAmountOptional,
  annualTurnover: rupeeAmountOptional,
};
// Everything optional — for a third party (referral) submitting on someone's behalf.
const loanAllOptional = {
  loanAmount: rupeeAmountOptional,
  employmentType: z.enum(employmentTypeValues).or(z.literal("")).optional(),
  monthlyIncome: rupeeAmountOptional,
  pincode: pincode.or(z.literal("")).optional(),
  ...loanDetails,
};

const phone = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"));

const optionalEmail = z.email("Enter a valid email address").max(254).or(z.literal("")).optional();

const consent = z.boolean().refine((v) => v === true, "Please accept to proceed");

const optionalAttribution = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().slice(0, 100) || undefined : undefined),
  z.string().max(100).optional(),
);

const base = {
  consent,
  turnstileToken: z.string().max(2048).optional(),
  utmSource: optionalAttribution,
  utmMedium: optionalAttribution,
  utmCampaign: optionalAttribution,
  utmLastSource: optionalAttribution,
  utmLastMedium: optionalAttribution,
  utmLastCampaign: optionalAttribution,
  // Partner affiliate ref (BP…/RP…); resolved to a partner in submitLead.
  ref: optionalAttribution,
};

export const enquirySchema = z.object({
  kind: z.literal("enquiry"),
  name: z.string().trim().min(2, "Please tell us your name").max(100),
  phone,
  email: optionalEmail,
  city: z.string().trim().max(100).optional(),
  productSlug: z
    .enum(productSlugs)
    .or(z.literal(""))
    .refine((v) => v !== "", { message: "Select the product you need" }),
  message: z.string().trim().max(2000).optional(),
  ...loanCore,
  // Cards have no loan amount; requiredness is enforced per-product in
  // enquiryFormSchema (below) so the server union stays a plain ZodObject.
  loanAmount: rupeeAmountOptional,
  ...loanDetails,
  ...base,
});

// Client-side resolver: everything enquirySchema checks, plus "loan amount is
// required unless the product is a card". Kept out of the discriminated union
// (which rejects refined schemas); the server parses with leadSchema.
export const enquiryFormSchema = enquirySchema.superRefine((v, ctx) => {
  if (!cardProducts.has(v.productSlug) && !v.loanAmount) {
    ctx.addIssue({
      path: ["loanAmount"],
      code: z.ZodIssueCode.custom,
      message: "Enter the loan amount in rupees (digits only)",
    });
  }
});

export const referralSchema = z.object({
  kind: z.literal("referral"),
  referrerName: z.string().trim().min(2, "Please tell us your name").max(100),
  referrerPhone: phone,
  name: z.string().trim().min(2, "Please tell us your friend's name").max(100),
  phone,
  productSlug: z.enum(productSlugs).or(z.literal("")).optional(),
  ...loanAllOptional,
  ...base,
});

export const contactReasonValues = [
  "borrowing_advice",
  "existing_enquiry",
  "partnership",
  "general_question",
  "other",
] as const;

export const contactSchema = z.object({
  kind: z.literal("contact"),
  reason: z
    .enum(contactReasonValues)
    .or(z.literal(""))
    .refine((value) => value !== "", { message: "Select how we can help" }),
  name: z.string().trim().min(2, "Please tell us your name").max(100),
  phone,
  email: z.email("Enter a valid email address").max(254),
  subject: z.string().trim().max(120, "Keep the subject under 120 characters").optional(),
  message: z.string().trim().min(10, "Tell us a little more so we can help").max(1000),
  ...base,
});

export const cibilNotifySchema = z.object({
  kind: z.literal("cibil_notify"),
  email: z.email("Enter a valid email address").max(254),
  ...base,
});

export const leadSchema = z.discriminatedUnion("kind", [
  enquirySchema,
  referralSchema,
  contactSchema,
  cibilNotifySchema,
]);

export type EnquiryInput = z.infer<typeof enquirySchema>;
export type ReferralInput = z.infer<typeof referralSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type CibilNotifyInput = z.infer<typeof cibilNotifySchema>;
export type LeadInput = z.infer<typeof leadSchema>;
