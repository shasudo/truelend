"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@truelend/db";
import { notifyPartnerKycSubmitted } from "@truelend/email";
import {
  evaluatePartnerApplication,
  isKycEditable,
  normalizeIndianMobile,
  validationMessages,
  validationPatterns,
} from "@truelend/reference";
import { reportPartnerActionFailure } from "./action-errors";
import { withPartnerMutation } from "./auth";
import { schedulePartnerBackgroundTask } from "./owned-request-context";

const LOCKED_MSG =
  "Your KYC is locked while it's under review or after verification. Contact us to make changes.";

export type KycState = { ok?: boolean; error?: string };

const upper = (s: string) => s.trim().toUpperCase();
const UNKNOWN_OUTCOME =
  "We couldn't confirm the result. Refresh this page to check your application before trying again.";

const phoneField = z
  .string()
  .trim()
  .transform(normalizeIndianMobile)
  .pipe(z.string().regex(validationPatterns.indianMobile, validationMessages.indianMobile));

const kycSchema = z.object({
  pan: z
    .string()
    .transform(upper)
    .pipe(z.string().regex(validationPatterns.pan, validationMessages.pan)),
  address: z.string().trim().min(10, "Enter your full address").max(500),

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
  nomineePhone: phoneField,

  occupation: z.string().trim().min(1, "Enter your occupation").max(120),
  designation: z.string().trim().min(1, "Enter your designation").max(120),
  experienceNote: z.string().trim().max(500).optional().default(""),
});

export async function savePartnerKyc(_prev: KycState, formData: FormData): Promise<KycState> {
  try {
    return await withPartnerMutation(async ({ db, session }) => {
      if (!session) return { error: "Please sign in again." };
      const parsed = kycSchema.safeParse(Object.fromEntries(formData));
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
        if (!isKycEditable(partner)) return "locked" as const;
        await tx
          .update(schema.partners)
          .set({
            pan: d.pan,
            address: d.address,
            bankName: d.bankName,
            accountHolder: d.accountHolder,
            accountNumber: d.accountNumber,
            bankBranch: d.bankBranch,
            ifsc: d.ifsc,
            nomineeName: d.nomineeName,
            nomineePhone: d.nomineePhone,
            occupation: d.occupation,
            designation: d.designation,
            experienceNote: d.experienceNote || null,
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
              "address",
              "bankName",
              "accountHolder",
              "accountNumber",
              "bankBranch",
              "ifsc",
              "nomineeName",
              "nomineePhone",
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
    });
  } catch (error) {
    reportPartnerActionFailure("partner_kyc_details_update_failed", error);
    return { error: UNKNOWN_OUTCOME };
  }
}

export async function submitForReview(_prev: KycState, _formData: FormData): Promise<KycState> {
  void _prev;
  void _formData;
  try {
    return await withPartnerMutation(async ({ db, ctx, env, session }) => {
      if (!session) return { error: "Please sign in again." };
      // Hoisted out of the transaction so the confirmation below is keyed to
      // this submission and a resubmission after a rejection mails again.
      let submittedAt: Date | undefined;
      const outcome = await db.transaction(async (tx) => {
        const [partner] = await tx
          .select()
          .from(schema.partners)
          .where(eq(schema.partners.userId, session.user.id))
          .limit(1)
          .for("update");
        if (!partner) return "missing" as const;
        if (partner.status === "pending" && partner.submittedAt != null) {
          return "already_submitted" as const;
        }
        const docs = await tx
          .select({ docType: schema.partnerDocuments.docType })
          .from(schema.partnerDocuments)
          .where(eq(schema.partnerDocuments.partnerId, partner.userId));
        const uploaded = new Set(docs.map((document) => document.docType));
        if (!evaluatePartnerApplication(partner, uploaded).canSubmit) return "incomplete" as const;
        submittedAt = new Date();
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
        return "submitted" as const;
      });
      if (outcome === "missing") return { error: "Please sign in again." };
      if (outcome === "already_submitted") return { ok: true };
      if (outcome === "incomplete") {
        return {
          error:
            "Your application details or documents changed. Review the checklist and try again.",
        };
      }
      schedulePartnerBackgroundTask(ctx, "partner_kyc_submitted_notification_failed", () =>
        notifyPartnerKycSubmitted(env, {
          to: session.user.email,
          name: session.user.name,
          dashboardUrl: `${env.BETTER_AUTH_URL}/dashboard`,
          idempotencyKey: `partner_kyc_submitted:${session.user.id}:${submittedAt?.toISOString() ?? ""}`,
        }),
      );
      revalidatePath("/dashboard");
      return { ok: true };
    });
  } catch (error) {
    reportPartnerActionFailure("partner_review_submit_failed", error);
    return { error: UNKNOWN_OUTCOME };
  }
}

export async function reopenApplication(_prev: KycState, _formData: FormData): Promise<KycState> {
  void _prev;
  void _formData;
  try {
    return await withPartnerMutation(async ({ db, session }) => {
      if (!session) return { error: "Please sign in again." };
      const outcome = await db.transaction(async (tx) => {
        const [partner] = await tx
          .select({ status: schema.partners.status, submittedAt: schema.partners.submittedAt })
          .from(schema.partners)
          .where(eq(schema.partners.userId, session.user.id))
          .limit(1)
          .for("update");
        if (!partner) return "missing" as const;
        if (partner.status === "pending" && partner.submittedAt == null) {
          return "already_reopened" as const;
        }
        // A verified partner can't reopen to edit — that would bypass the review
        // they already passed. Reopen only withdraws an undecided submission.
        if (partner.status === "verified" || !partner.submittedAt) return "not_allowed" as const;
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
        return "reopened" as const;
      });
      if (outcome === "missing") return { error: "Please sign in again." };
      if (outcome === "already_reopened") return { ok: true };
      if (outcome === "not_allowed") {
        return { error: "This application can no longer be reopened for editing." };
      }
      revalidatePath("/dashboard");
      return { ok: true };
    });
  } catch (error) {
    reportPartnerActionFailure("partner_review_reopen_failed", error);
    return { error: UNKNOWN_OUTCOME };
  }
}
