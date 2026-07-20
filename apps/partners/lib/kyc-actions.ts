"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@truelend/db";
import {
  evaluatePartnerApplication,
  isKycEditable,
  partnerTypeValues,
  partnerProductOptions,
  rupeesToPaise,
  normalizeIndianMobile,
  validationMessages,
  validationPatterns,
} from "@truelend/reference";
import { getAuthContext } from "./auth";

const LOCKED_MSG =
  "Your KYC is locked while it's under review or after verification. Contact us to make changes.";

export type KycState = { ok?: boolean; error?: string };

const upper = (s: string) => s.trim().toUpperCase();

const phoneField = z
  .string()
  .trim()
  .transform(normalizeIndianMobile)
  .pipe(z.string().regex(validationPatterns.indianMobile, validationMessages.indianMobile));

const kycSchema = z
  .object({
    // Mirrors the immutable partner.type; re-checked against the DB row below.
    type: z.enum(partnerTypeValues),
    pan: z
      .string()
      .transform(upper)
      .pipe(z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Enter a valid PAN (e.g. ABCDE1234F)")),
    gst: z
      .string()
      .transform((s) => s.trim().toUpperCase())
      .pipe(
        z
          .string()
          .regex(/^[0-9A-Z]{15}$/, "GST must be 15 characters")
          .or(z.literal("")),
      )
      .optional(),
    address: z.string().trim().min(10, "Enter your full address").max(500),
    residenceAddress: z.string().trim().max(500).optional().default(""),

    bankName: z.string().trim().min(2, "Enter the bank name").max(120),
    accountHolder: z.string().trim().min(2, "Enter the account holder name").max(160),
    accountNumber: z
      .string()
      .trim()
      .regex(/^\d{9,18}$/, "Enter a valid account number"),
    bankBranch: z.string().trim().min(2, "Enter the bank branch").max(120),
    ifsc: z
      .string()
      .transform(upper)
      .pipe(z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Enter a valid IFSC (e.g. HDFC0001234)")),

    nomineeName: z.string().trim().min(2, "Enter the nominee name").max(160),
    nomineeAadhaar: z
      .string()
      .transform((s) => s.replace(/\s/g, ""))
      .pipe(z.string().regex(/^\d{12}$/, "Enter a valid 12-digit Aadhaar")),
    nomineePhone: phoneField,

    // business
    alternatePhone: z
      .union([z.literal(""), phoneField])
      .optional()
      .default(""),
    productsHandled: z.array(z.enum(partnerProductOptions)).optional().default([]),
    yearsExperience: z.string().trim().optional().default(""),
    monthlyVolumeLoans: z.string().trim().optional().default(""),
    monthlyVolumeInsurance: z.string().trim().optional().default(""),
    monthlyVolumeMutualFunds: z.string().trim().optional().default(""),

    // referral
    occupation: z.string().trim().max(120).optional().default(""),
    designation: z.string().trim().max(120).optional().default(""),
    experienceNote: z.string().trim().max(500).optional().default(""),
  })
  .superRefine((d, ctx) => {
    if (d.type === "business") {
      if (d.productsHandled.length === 0)
        ctx.addIssue({
          code: "custom",
          path: ["productsHandled"],
          message: "Select at least one product you handle",
        });
      if (!/^\d{1,2}$/.test(d.yearsExperience))
        ctx.addIssue({
          code: "custom",
          path: ["yearsExperience"],
          message: "Enter your years of experience",
        });
      if (!d.residenceAddress)
        ctx.addIssue({
          code: "custom",
          path: ["residenceAddress"],
          message: "Enter your residence address",
        });
      for (const [key, label] of [
        ["monthlyVolumeLoans", "loans"],
        ["monthlyVolumeInsurance", "insurance"],
        ["monthlyVolumeMutualFunds", "mutual funds"],
      ] as const) {
        if (rupeesToPaise(d[key]) == null)
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: `Enter your monthly ${label} volume`,
          });
      }
    } else {
      if (!d.occupation)
        ctx.addIssue({ code: "custom", path: ["occupation"], message: "Enter your occupation" });
      if (!d.designation)
        ctx.addIssue({ code: "custom", path: ["designation"], message: "Enter your designation" });
    }
  });

export async function savePartnerKyc(_prev: KycState, formData: FormData): Promise<KycState> {
  const { db, ctx, auth } = getAuthContext();
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { error: "Please sign in again." };
    // Object.fromEntries keeps only one value per key; productsHandled is a
    // multi-checkbox group, so pull all of its values explicitly.
    const raw: Record<string, unknown> = Object.fromEntries(formData);
    raw.productsHandled = formData.getAll("productsHandled");
    const parsed = kycSchema.safeParse(raw);
    if (!parsed.success)
      return { error: parsed.error.issues[0]?.message ?? "Please check the fields." };
    const d = parsed.data;

    const saved = await db.transaction(async (tx) => {
      const [partner] = await tx
        .select()
        .from(schema.partners)
        .where(eq(schema.partners.userId, session.user.id))
        .limit(1)
        .for("update");
      if (!partner) return "missing" as const;
      // type is immutable; a mismatch means the hidden field was tampered with.
      if (d.type !== partner.type) return "missing" as const;
      if (!isKycEditable(partner)) return "locked" as const;
      const business = d.type === "business";
      await tx
        .update(schema.partners)
        .set({
          pan: d.pan,
          gst: business && d.gst && d.gst.length > 0 ? d.gst : null,
          address: d.address,
          bankName: d.bankName,
          accountHolder: d.accountHolder,
          accountNumber: d.accountNumber,
          bankBranch: d.bankBranch,
          ifsc: d.ifsc,
          nomineeName: d.nomineeName,
          nomineeAadhaar: d.nomineeAadhaar,
          nomineePhone: d.nomineePhone,
          // business-only — cleared for referral partners
          alternatePhone: business ? d.alternatePhone || null : null,
          productsHandled: business ? d.productsHandled : null,
          yearsExperience: business ? Number(d.yearsExperience) : null,
          monthlyVolumeLoansPaise: business ? rupeesToPaise(d.monthlyVolumeLoans) : null,
          monthlyVolumeInsurancePaise: business ? rupeesToPaise(d.monthlyVolumeInsurance) : null,
          monthlyVolumeMutualFundsPaise: business
            ? rupeesToPaise(d.monthlyVolumeMutualFunds)
            : null,
          residenceAddress: business ? d.residenceAddress : null,
          // referral-only — cleared for business partners
          occupation: business ? null : d.occupation,
          designation: business ? null : d.designation,
          experienceNote: business ? null : d.experienceNote || null,
        })
        .where(eq(schema.partners.userId, session.user.id));
      await tx.insert(schema.auditLog).values({
        actorId: session.user.id,
        actorEmail: session.user.email,
        action: "partner.kyc_details_update",
        entityType: "partner",
        entityId: session.user.id,
        // Field names only — never copy PAN, bank, Aadhaar or nominee values
        // into the generic audit trail.
        after: {
          fields: [
            "pan",
            "gst",
            "address",
            "residenceAddress",
            "bankName",
            "accountHolder",
            "accountNumber",
            "bankBranch",
            "ifsc",
            "nomineeName",
            "nomineeAadhaar",
            "nomineePhone",
            "alternatePhone",
            "productsHandled",
            "yearsExperience",
            "monthlyVolume",
            "occupation",
            "designation",
            "experienceNote",
          ],
        },
      });
      return "saved" as const;
    });
    if (saved === "missing") return { error: "Please sign in again." };
    if (saved === "locked") return { error: LOCKED_MSG };
    revalidatePath("/dashboard");
    revalidatePath("/kyc");
    return { ok: true };
  } finally {
    ctx.waitUntil(db.$client.end());
  }
}

export async function submitForReview() {
  const { db, ctx, auth } = getAuthContext();
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return;
    await db.transaction(async (tx) => {
      const [partner] = await tx
        .select()
        .from(schema.partners)
        .where(eq(schema.partners.userId, session.user.id))
        .limit(1)
        .for("update");
      if (!partner) return;
      const docs = await tx
        .select({ docType: schema.partnerDocuments.docType })
        .from(schema.partnerDocuments)
        .where(eq(schema.partnerDocuments.partnerId, partner.userId));
      const uploaded = new Set(docs.map((document) => document.docType));
      if (!evaluatePartnerApplication(partner, uploaded).canSubmit) return;
      const submittedAt = new Date();
      await tx
        .update(schema.partners)
        .set({ submittedAt, status: "pending", rejectionReason: null })
        .where(eq(schema.partners.userId, partner.userId));
      await tx.insert(schema.auditLog).values({
        actorId: session.user.id,
        actorEmail: session.user.email,
        action: "partner.submit_review",
        entityType: "partner",
        entityId: partner.userId,
        after: { status: "pending", submittedAt: submittedAt.toISOString() },
      });
    });
    revalidatePath("/dashboard");
  } finally {
    ctx.waitUntil(db.$client.end());
  }
}

export async function reopenApplication() {
  const { db, ctx, auth } = getAuthContext();
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return;
    await db.transaction(async (tx) => {
      const [partner] = await tx
        .select({ status: schema.partners.status, submittedAt: schema.partners.submittedAt })
        .from(schema.partners)
        .where(eq(schema.partners.userId, session.user.id))
        .limit(1)
        .for("update");
      // A verified partner can't reopen to edit — that would bypass the review
      // they already passed. Reopen only withdraws an undecided submission.
      if (!partner || partner.status === "verified" || !partner.submittedAt) return;
      await tx
        .update(schema.partners)
        .set({ submittedAt: null })
        .where(eq(schema.partners.userId, session.user.id));
      await tx.insert(schema.auditLog).values({
        actorId: session.user.id,
        actorEmail: session.user.email,
        action: "partner.withdraw_review",
        entityType: "partner",
        entityId: session.user.id,
        before: { submittedAt: partner.submittedAt.toISOString() },
        after: { submittedAt: null },
      });
    });
    revalidatePath("/dashboard");
  } finally {
    ctx.waitUntil(db.$client.end());
  }
}
