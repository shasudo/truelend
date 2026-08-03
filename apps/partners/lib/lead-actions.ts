"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@truelend/db";
import {
  customerConsentVersion,
  productSlugs,
  productName,
  rupeesToPaise,
  employmentTypeValues,
  residenceTypeValues,
  normalizeIndianMobile,
  validationMessages,
  validationPatterns,
} from "@truelend/reference";
import { notifyLeadReceived, notifyNewLead } from "@truelend/email";
import { reportPartnerActionFailure } from "./action-errors";
import { withPartnerMutation } from "./auth";
import { schedulePartnerBackgroundTask } from "./owned-request-context";

const phone = z
  .string()
  .trim()
  .transform(normalizeIndianMobile)
  .pipe(z.string().regex(validationPatterns.indianMobile, validationMessages.indianMobile));

const blank = (v: string | undefined) => (v && v.length > 0 ? v : null);
const intOrNull = (v: string | undefined) => {
  if (!v) return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
};

// Detailed loan-application fields are optional here — a partner captures what
// the customer gave them. Amounts are rupee strings, converted to paise on save.
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
const loanApplicationFields = {
  loanAmount: rupeeAmountOptional,
  tenureMonths: smallIntOptional(600, "Tenure must be 600 months or less"),
  loanPurpose: z.string().trim().max(200).optional(),
  pincode: z
    .string()
    .trim()
    .regex(validationPatterns.pincode, validationMessages.pincode)
    .or(z.literal(""))
    .optional(),
  residenceType: z.enum(residenceTypeValues).or(z.literal("")).optional(),
  employmentType: z.enum(employmentTypeValues).or(z.literal("")).optional(),
  monthlyIncome: rupeeAmountOptional,
  employerName: z.string().trim().max(160).optional(),
  experienceYears: smallIntOptional(100, "Experience must be 100 years or less"),
  existingEmi: rupeeAmountOptional,
  assetValue: rupeeAmountOptional,
  annualTurnover: rupeeAmountOptional,
};

const leadSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  phone,
  email: z.email().max(254).or(z.literal("")).optional(),
  city: z.string().trim().max(100).optional(),
  productSlug: z.enum(productSlugs).or(z.literal("")).optional(),
  message: z.string().trim().max(2000).optional(),
  ...loanApplicationFields,
  consent: z.literal("on", { error: "Confirm the customer's consent before submitting." }),
});

export type LeadState = { ok?: boolean; error?: string };

export async function submitLead(_prev: LeadState, formData: FormData): Promise<LeadState> {
  try {
    return await withPartnerMutation(async ({ db, ctx, env, partner }) => {
      if (!partner || partner.status !== "verified") {
        return { error: "Your account isn't verified yet." };
      }
      if (
        !(await env.PARTNER_WRITE_RATE_LIMITER.limit({ key: `lead:${partner.userId}` })).success
      ) {
        return { error: "Too many submissions. Please wait a minute and try again." };
      }
      const parsed = leadSchema.safeParse(Object.fromEntries(formData));
      if (!parsed.success)
        return { error: parsed.error.issues[0]?.message ?? "Please check the fields." };
      const d = parsed.data;
      const consentAt = new Date();
      // Hoisted out of the transaction: the notification keys below derive from
      // it so a retried submission cannot produce a second copy of either email.
      let leadId: string | undefined;
      const outcome = await db.transaction(async (tx) => {
        const [currentPartner] = await tx
          .select({ status: schema.partners.status })
          .from(schema.partners)
          .where(eq(schema.partners.userId, partner.userId))
          .limit(1)
          .for("update");
        if (currentPartner?.status !== "verified") return "not_verified" as const;
        const [lead] = await tx
          .insert(schema.leads)
          .values({
            kind: "referral",
            partnerId: partner.userId,
            consent: true,
            consentAt,
            consentSource: "partner_form",
            consentVersion: customerConsentVersion,
            name: d.name,
            phone: d.phone,
            email: blank(d.email),
            city: blank(d.city),
            productSlug: blank(d.productSlug),
            message: blank(d.message),
            loanAmountPaise: rupeesToPaise(d.loanAmount),
            tenureMonths: intOrNull(d.tenureMonths),
            loanPurpose: blank(d.loanPurpose),
            pincode: blank(d.pincode),
            residenceType: d.residenceType || null,
            employmentType: d.employmentType || null,
            monthlyIncomePaise: rupeesToPaise(d.monthlyIncome),
            employerName: blank(d.employerName),
            experienceYears: intOrNull(d.experienceYears),
            existingEmiPaise: rupeesToPaise(d.existingEmi),
            assetValuePaise: rupeesToPaise(d.assetValue),
            annualTurnoverPaise: rupeesToPaise(d.annualTurnover),
          })
          .returning({ id: schema.leads.id });
        leadId = lead?.id;
        await tx.insert(schema.auditLog).values({
          actorId: partner.userId,
          action: "lead.create",
          entityType: "lead",
          entityId: lead?.id,
          after: { source: "partner_form", consentVersion: customerConsentVersion },
        });
        return "created" as const;
      });
      if (outcome === "not_verified") {
        return { error: "Your verification status changed. Refresh the page before trying again." };
      }
      const product = d.productSlug ? productName(d.productSlug) : undefined;
      schedulePartnerBackgroundTask(ctx, "partner_lead_notification_failed", () =>
        notifyNewLead(env, {
          name: d.name,
          phone: d.phone,
          email: blank(d.email),
          city: blank(d.city),
          product,
          message: blank(d.message),
          source: "Referral Partner",
          idempotencyKey: leadId ? `new_lead:${leadId}` : undefined,
        }),
      );
      // Acknowledge to the referred applicant. The partner supplies the address
      // and it is optional, so this stays best-effort and silent without one.
      const applicantEmail = blank(d.email);
      if (applicantEmail) {
        schedulePartnerBackgroundTask(ctx, "partner_lead_acknowledgement_failed", () =>
          notifyLeadReceived(env, {
            to: applicantEmail,
            name: d.name,
            product,
            kind: "referral",
            idempotencyKey: leadId ? `lead_received:${leadId}` : undefined,
          }),
        );
      }
      revalidatePath("/dashboard");
      return { ok: true };
    });
  } catch (error) {
    reportPartnerActionFailure("partner_lead_submit_failed", error);
    return {
      error:
        "We couldn't confirm the referral. Refresh your referrals before trying again to avoid a duplicate.",
    };
  }
}
