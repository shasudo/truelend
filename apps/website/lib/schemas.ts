import { z } from "zod";
import { products } from "@/content/products";

const productSlugs = products.map((p) => p.slug) as [string, ...string[]];

const phone = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"));

const optionalEmail = z.email("Enter a valid email address").max(254).or(z.literal("")).optional();

const consent = z.boolean().refine((v) => v === true, "Please accept to proceed");

const base = {
  consent,
  turnstileToken: z.string().max(2048).optional(),
  utmSource: z.string().max(100).optional(),
  utmMedium: z.string().max(100).optional(),
  utmCampaign: z.string().max(100).optional(),
};

export const enquirySchema = z.object({
  kind: z.literal("enquiry"),
  name: z.string().trim().min(2, "Please tell us your name").max(100),
  phone,
  email: optionalEmail,
  city: z.string().trim().max(100).optional(),
  productSlug: z.enum(productSlugs).or(z.literal("")).optional(),
  message: z.string().trim().max(2000).optional(),
  ...base,
});

export const referralSchema = z.object({
  kind: z.literal("referral"),
  referrerName: z.string().trim().min(2, "Please tell us your name").max(100),
  referrerPhone: phone,
  name: z.string().trim().min(2, "Please tell us your friend's name").max(100),
  phone,
  productSlug: z.enum(productSlugs).or(z.literal("")).optional(),
  ...base,
});

export const contactSchema = z.object({
  kind: z.literal("contact"),
  name: z.string().trim().min(2, "Please tell us your name").max(100),
  phone,
  email: optionalEmail,
  message: z.string().trim().min(10, "Tell us a little more so we can help").max(2000),
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
