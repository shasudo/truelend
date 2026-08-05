import { z } from "zod";
import {
  isBankApplyProductSlug,
  normalizeIndianMobile,
  validationMessages,
  validationPatterns,
} from "@truelend/reference";
import { clean } from "./attribution";

const phone = z
  .string()
  .trim()
  .transform(normalizeIndianMobile)
  .pipe(z.string().regex(validationPatterns.indianMobile, validationMessages.indianMobile));

export const bankApplySchema = z.object({
  productSlug: z.string().refine(isBankApplyProductSlug, { message: "Select a product" }),
  phone,
  consent: z.boolean().refine((v) => v === true, "Please accept to proceed"),
  turnstileToken: z.string().max(2048).optional(),
  // Referral Partner affiliate ref (RP…); resolved in startBankApply.
  ref: z.preprocess(clean, z.string().max(100).optional()),
});

export type BankApplyInput = z.infer<typeof bankApplySchema>;
