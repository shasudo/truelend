"use server";

import { headers } from "next/headers";
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
import { notifyNewLead } from "@truelend/email";
import { getAuthContext } from "./auth";

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
const smallIntOptional = z
  .string()
  .trim()
  .regex(validationPatterns.smallInteger, validationMessages.smallInteger)
  .or(z.literal(""))
  .optional();
const loanApplicationFields = {
  loanAmount: rupeeAmountOptional,
  tenureMonths: smallIntOptional,
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
  experienceYears: smallIntOptional,
  existingEmi: rupeeAmountOptional,
  assetValue: rupeeAmountOptional,
  annualTurnover: rupeeAmountOptional,
};

async function verifiedPartner() {
  const { db, ctx, auth, env } = getAuthContext();
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { db, ctx, env, partner: null };
    const rows = await db
      .select()
      .from(schema.partners)
      .where(eq(schema.partners.userId, session.user.id))
      .limit(1);
    const partner = rows[0];
    return { db, ctx, env, partner: partner?.status === "verified" ? partner : null };
  } catch (error) {
    ctx.waitUntil(db.$client.end());
    throw error;
  }
}

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
  const { db, ctx, env, partner } = await verifiedPartner();
  try {
    if (!partner) return { error: "Your account isn't verified yet." };
    if (!(await env.PARTNER_WRITE_RATE_LIMITER.limit({ key: `lead:${partner.userId}` })).success) {
      return { error: "Too many submissions. Please wait a minute and try again." };
    }
    const parsed = leadSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success)
      return { error: parsed.error.issues[0]?.message ?? "Please check the fields." };
    const d = parsed.data;
    const consentAt = new Date();
    await db.transaction(async (tx) => {
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
      await tx.insert(schema.auditLog).values({
        actorId: partner.userId,
        action: "lead.create",
        entityType: "lead",
        entityId: lead?.id,
        after: { source: "partner_form", consentVersion: customerConsentVersion },
      });
    });
    ctx.waitUntil(
      notifyNewLead(env, {
        name: d.name,
        phone: d.phone,
        email: blank(d.email),
        city: blank(d.city),
        product: d.productSlug ? productName(d.productSlug) : undefined,
        message: blank(d.message),
        source: "Referral Partner",
      }),
    );
    revalidatePath("/dashboard");
    return { ok: true };
  } finally {
    ctx.waitUntil(db.$client.end());
  }
}
