import { z } from "zod";
import {
  productSlugs,
  employmentTypeValues,
  residenceTypeValues,
  loanPurposes,
  cardProducts,
  normalizeIndianMobile,
  validationMessages,
  validationPatterns,
} from "@truelend/reference";
import { clean } from "./attribution";

/* Detailed loan-application fields. Amounts are rupee strings here (digits
 * only) and become integer paise at the server boundary via rupeesToPaise. */
const rupeeAmount = (label: string) =>
  z.string().trim().regex(validationPatterns.rupeeAmount, `Enter ${label} in rupees (digits only)`);
const rupeeAmountOptional = z
  .string()
  .trim()
  .regex(validationPatterns.rupeeAmount, validationMessages.rupeeAmount)
  .or(z.literal(""))
  .optional();
const smallIntOptional = (maximum: number, message: string) =>
  z
    .string()
    .trim()
    .regex(validationPatterns.smallInteger, validationMessages.smallInteger)
    .or(z.literal(""))
    .optional()
    .refine((value) => !value || Number(value) <= maximum, { message });
const pincode = z.string().trim().regex(validationPatterns.pincode, validationMessages.pincode);

// Optional detail, shared by every detailed form.
const loanDetails = {
  tenureMonths: smallIntOptional(600, "Tenure must be 600 months or less"),
  loanPurpose: z.string().trim().max(200).optional(),
  residenceType: z.enum(residenceTypeValues).or(z.literal("")).optional(),
  employerName: z.string().trim().max(160).optional(),
  experienceYears: smallIntOptional(100, "Experience must be 100 years or less"),
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
  .transform(normalizeIndianMobile)
  .pipe(z.string().regex(validationPatterns.indianMobile, validationMessages.indianMobile));

const consent = z.boolean().refine((v) => v === true, "Please accept to proceed");

const optionalAttribution = z.preprocess(clean, z.string().max(100).optional());

const base = {
  consent,
  turnstileToken: z.string().max(2048).optional(),
  utmSource: optionalAttribution,
  utmMedium: optionalAttribution,
  utmCampaign: optionalAttribution,
  utmLastSource: optionalAttribution,
  utmLastMedium: optionalAttribution,
  utmLastCampaign: optionalAttribution,
  // Referral Partner affiliate ref (RP…); resolved in submitLead.
  ref: optionalAttribution,
};

// Self-application enquiry — fields mirror the on-page assessment form 1:1.
// Enums accept "" as input (the select placeholder) but a refine rejects it, so
// the empty default still typechecks while an unmade choice fails with a clear
// message. Amounts are digit-only rupee strings, converted to paise server-side.
export const enquirySchema = z.object({
  kind: z.literal("enquiry"),
  // 01 · Loan requirement
  productSlug: z
    .enum(productSlugs)
    .or(z.literal(""))
    .refine((v) => v !== "", { message: "Select the product you need" }),
  // Cards have no loan amount; product-specific requiredness is added to both
  // the client form schema and the final server union below.
  loanAmount: rupeeAmountOptional,
  loanPurpose: z
    .enum(loanPurposes)
    .or(z.literal(""))
    .refine((v) => v !== "", { message: "Select the purpose of the loan" }),
  tenureMonths: loanDetails.tenureMonths,
  preferredEmi: rupeeAmountOptional,
  // 02 · About you
  name: z.string().trim().min(2, "Please tell us your name").max(100),
  phone,
  email: z.email("Enter a valid email address").max(254),
  city: z.string().trim().min(1, "Enter your city").max(100),
  pincode,
  // 03 · Employment & income
  employmentType: z
    .enum(employmentTypeValues)
    .or(z.literal(""))
    .refine((v) => v !== "", { message: "Select your employment type" }),
  employerName: z.string().trim().min(1, "Enter your employer or business name").max(160),
  monthlyIncome: rupeeAmount("your monthly income"),
  experienceYears: z
    .string()
    .trim()
    .regex(validationPatterns.smallInteger, "Select your work experience")
    .refine((value) => Number(value) <= 100, {
      message: "Experience must be 100 years or less",
    }),
  existingWithEmployer: z.string().trim().max(40).optional(),
  // 04 · Existing borrowings
  existingEmi: rupeeAmountOptional,
  outstandingLoanAmount: rupeeAmountOptional,
  creditCardOutstanding: rupeeAmountOptional,
  // 05 · Additional information
  message: z.string().trim().max(500).optional(),
  ...base,
});

function requireLoanAmount(
  value: { productSlug: string; loanAmount?: string },
  ctx: z.RefinementCtx,
) {
  if (!cardProducts.has(value.productSlug) && !value.loanAmount) {
    ctx.addIssue({
      path: ["loanAmount"],
      code: z.ZodIssueCode.custom,
      message: "Enter the loan amount in rupees (digits only)",
    });
  }
}

export const enquiryFormSchema = enquirySchema.superRefine(requireLoanAmount);

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

export const leadSchema = z
  .discriminatedUnion("kind", [enquirySchema, referralSchema, contactSchema, cibilNotifySchema])
  .superRefine((value, ctx) => {
    if (value.kind === "enquiry") requireLoanAmount(value, ctx);
  });
