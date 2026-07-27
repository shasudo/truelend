"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { schema, type Database } from "@truelend/db";
import { notifyPartnerDecision } from "@truelend/email";
import { getMutationContext } from "./auth";
import { normalizePartnerLedger } from "./partner-ledger";
import { changedPartnerReviewFields, partnerRejectionRefusal } from "./partner-review-policy";
import {
  scheduleAdminBackgroundTask,
  scheduleAdminRequestContextCleanup,
} from "./request-context-cleanup";
import {
  evaluatePartnerApplication,
  formatPaise,
  normalizeIndianMobile,
  rupeesToPaise,
  validationMessages,
  validationPatterns,
} from "@truelend/reference";

interface AdminActionResult {
  ok?: boolean;
  error?: string;
  uncertain?: boolean;
}

export type PayoutResult = AdminActionResult;
export type PartnerDetailsResult = AdminActionResult;
export type PartnerReviewResult = AdminActionResult;

const UNKNOWN_DETAILS_OUTCOME =
  "We couldn't confirm the details update. Reload this partner before trying again.";
const UNKNOWN_PAYOUT_OUTCOME =
  "We couldn't confirm the ledger entry. Reload the ledger before trying again to avoid a duplicate.";
const UNKNOWN_APPROVAL_OUTCOME =
  "We couldn't confirm the approval. Reload this partner before trying again.";
const UNKNOWN_REJECTION_OUTCOME =
  "We couldn't confirm the rejection. Reload this partner before trying again.";
const UNKNOWN_REVOCATION_OUTCOME =
  "We couldn't confirm the verification change. Reload this partner before trying again.";

function reportPartnerAdminActionFailure(event: string, error: unknown): void {
  console.error(
    JSON.stringify({
      event,
      errorType: error instanceof Error ? error.name : "unknown",
    }),
  );
}

async function admin() {
  const { db, ctx, env, user } = await getMutationContext();
  return {
    db,
    ctx,
    env,
    isAdmin: user?.role === "admin",
    adminId: user?.id,
    adminEmail: user?.email,
  };
}

type PartnerAdminContext = Awaited<ReturnType<typeof admin>>;

async function withPartnerAdminAction<TResult>(
  event: string,
  fallback: TResult,
  run: (context: PartnerAdminContext) => Promise<TResult>,
): Promise<TResult> {
  let context: PartnerAdminContext | undefined;
  try {
    context = await admin();
    return await run(context);
  } catch (error) {
    reportPartnerAdminActionFailure(event, error);
    return fallback;
  } finally {
    if (context) scheduleAdminRequestContextCleanup(context);
  }
}

// partnerId === user.id (1:1), so contact info comes from the user row.
async function partnerContact(db: Database, partnerId: string) {
  const rows = await db
    .select({ email: schema.user.email, name: schema.user.name })
    .from(schema.user)
    .where(eq(schema.user.id, partnerId))
    .limit(1);
  return rows[0];
}

const idSchema = z.object({ partnerId: z.string().min(1) });

const emptyToNull = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const isIsoDate = (value: string) => {
  if (value.length === 0) return true;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
};

const optionalText = (max: number) => z.string().trim().max(max).transform(emptyToNull);

const optionalUpper = (pattern: RegExp, message: string) =>
  z
    .string()
    .trim()
    .transform((value) => (value.length > 0 ? value.toUpperCase() : null))
    .pipe(z.string().regex(pattern, message).nullable());

const partnerDetailsSchema = z.object({
  partnerId: z.string().min(1),
  phone: z
    .string()
    .trim()
    .transform((value) => (value.length > 0 ? normalizeIndianMobile(value) : null))
    .pipe(
      z.string().regex(validationPatterns.indianMobile, validationMessages.indianMobile).nullable(),
    ),
  dateOfBirth: z
    .string()
    .trim()
    .regex(/^$|^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")
    .refine(isIsoDate, "Enter a valid date")
    .transform(emptyToNull),
  city: optionalText(120),
  referralType: optionalText(120),
  occupation: optionalText(120),
  designation: optionalText(120),
  experienceNote: optionalText(500),
  pan: optionalUpper(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Enter a valid PAN (e.g. ABCDE1234F)"),
  address: optionalText(500),
  bankName: optionalText(120),
  accountHolder: optionalText(160),
  accountNumber: z
    .string()
    .trim()
    .transform((value) => (value.length > 0 ? value : null))
    .pipe(
      z
        .string()
        .regex(/^\d{9,18}$/, "Enter a valid account number")
        .nullable(),
    ),
  bankBranch: optionalText(120),
  ifsc: optionalUpper(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Enter a valid IFSC (e.g. HDFC0001234)"),
  nomineeName: optionalText(160),
  nomineeAadhaar: z
    .string()
    .trim()
    .transform((value) => {
      const normalized = value.replace(/\s/g, "");
      return normalized.length > 0 ? normalized : null;
    })
    .pipe(
      z
        .string()
        .regex(/^\d{12}$/, "Enter a valid 12-digit Aadhaar")
        .nullable(),
    ),
  nomineePhone: z
    .string()
    .trim()
    .transform((value) => (value.length > 0 ? normalizeIndianMobile(value) : null))
    .pipe(
      z.string().regex(validationPatterns.indianMobile, validationMessages.indianMobile).nullable(),
    ),
});

export async function updatePartnerDetailsAction(
  _prev: PartnerDetailsResult,
  formData: FormData,
): Promise<PartnerDetailsResult> {
  return withPartnerAdminAction<PartnerDetailsResult>(
    "partner_admin_details_update_failed",
    { error: UNKNOWN_DETAILS_OUTCOME, uncertain: true },
    async ({ db, isAdmin, adminId, adminEmail }) => {
      if (!isAdmin || !adminId) return { error: "Not authorized." };
      const parsed = partnerDetailsSchema.safeParse(Object.fromEntries(formData));
      if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Please check the fields." };
      }
      const details = parsed.data;
      const saved = await db.transaction(async (tx) => {
        const [partner] = await tx
          .select()
          .from(schema.partners)
          .where(eq(schema.partners.userId, details.partnerId))
          .limit(1)
          .for("update");
        if (!partner) return false;

        const changedReviewFields = changedPartnerReviewFields(partner, details);
        const requiresReview = partner.status === "verified" && changedReviewFields.length > 0;
        const now = new Date();
        await tx
          .update(schema.partners)
          .set({
            phone: details.phone,
            dateOfBirth: details.dateOfBirth,
            city: details.city,
            referralType: details.referralType,
            occupation: details.occupation,
            designation: details.designation,
            experienceNote: details.experienceNote,
            pan: details.pan,
            address: details.address,
            bankName: details.bankName,
            accountHolder: details.accountHolder,
            accountNumber: details.accountNumber,
            bankBranch: details.bankBranch,
            ifsc: details.ifsc,
            nomineeName: details.nomineeName,
            nomineeAadhaar: details.nomineeAadhaar,
            nomineePhone: details.nomineePhone,
            ...(requiresReview
              ? { status: "pending" as const, submittedAt: now, verifiedBy: null, verifiedAt: null }
              : {}),
          })
          .where(eq(schema.partners.userId, details.partnerId));
        await tx.insert(schema.auditLog).values({
          actorId: adminId,
          actorEmail: adminEmail,
          action: "partner.admin_details_update",
          entityType: "partner",
          entityId: details.partnerId,
          // Names only: the audit log must not duplicate KYC, bank, or Aadhaar values.
          after: {
            fields: Object.keys(details).filter((field) => field !== "partnerId"),
            reviewReset: requiresReview,
            changedReviewFields,
          },
        });
        return true;
      });
      if (!saved) return { error: "Referral Partner not found." };
      revalidatePath(`/partners/${details.partnerId}`);
      revalidatePath("/partners");
      return { ok: true };
    },
  );
}

export async function approvePartnerAction(
  _prev: PartnerReviewResult,
  formData: FormData,
): Promise<PartnerReviewResult> {
  return withPartnerAdminAction<PartnerReviewResult>(
    "partner_approval_failed",
    { error: UNKNOWN_APPROVAL_OUTCOME, uncertain: true },
    async ({ db, ctx, env, isAdmin, adminId, adminEmail }) => {
      if (!isAdmin || !adminId) return { error: "Not authorized." };
      const parsed = idSchema.safeParse(Object.fromEntries(formData));
      if (!parsed.success) return { error: "Invalid approval request." };
      const outcome = await db.transaction(async (tx) => {
        const [partner] = await tx
          .select()
          .from(schema.partners)
          .where(eq(schema.partners.userId, parsed.data.partnerId))
          .limit(1)
          .for("update");
        if (!partner) return "missing" as const;
        const docs = await tx
          .select({ docType: schema.partnerDocuments.docType })
          .from(schema.partnerDocuments)
          .where(eq(schema.partnerDocuments.partnerId, parsed.data.partnerId));
        const uploaded = new Set(docs.map((doc) => doc.docType));
        if (!evaluatePartnerApplication(partner, uploaded).canApprove) {
          return "not_eligible" as const;
        }
        const now = new Date();
        await tx
          .update(schema.partners)
          .set({
            status: "verified",
            verifiedBy: adminId,
            verifiedAt: now,
            rejectionReason: null,
          })
          .where(eq(schema.partners.userId, parsed.data.partnerId));
        await tx.insert(schema.auditLog).values({
          actorId: adminId,
          actorEmail: adminEmail,
          action: "partner.approve",
          entityType: "partner",
          entityId: parsed.data.partnerId,
          before: { status: partner.status },
          after: { status: "verified", verifiedAt: now.toISOString() },
        });
        return "approved" as const;
      });
      if (outcome === "missing") return { error: "Referral Partner not found." };
      if (outcome === "not_eligible") {
        return {
          error:
            "This application is no longer eligible for approval. Reload and review its checklist.",
        };
      }
      const contact = await partnerContact(db, parsed.data.partnerId);
      if (contact) {
        scheduleAdminBackgroundTask(ctx, "partner_approval_notification_failed", () =>
          notifyPartnerDecision(env, {
            to: contact.email,
            name: contact.name,
            decision: "verified",
            loginUrl: `${env.PARTNERS_URL}/login`,
          }),
        );
      }
      revalidatePath(`/partners/${parsed.data.partnerId}`);
      revalidatePath("/partners");
      return { ok: true };
    },
  );
}

export async function revokePartnerAction(
  _prev: PartnerReviewResult,
  formData: FormData,
): Promise<PartnerReviewResult> {
  return withPartnerAdminAction<PartnerReviewResult>(
    "partner_verification_revoke_failed",
    { error: UNKNOWN_REVOCATION_OUTCOME, uncertain: true },
    async ({ db, isAdmin, adminId, adminEmail }) => {
      if (!isAdmin || !adminId) return { error: "Not authorized." };
      const parsed = idSchema.safeParse(Object.fromEntries(formData));
      if (!parsed.success) return { error: "Invalid verification request." };
      // Back to pending: an accidental approval must be reversible from the UI.
      const outcome = await db.transaction(async (tx) => {
        const [partner] = await tx
          .select({ status: schema.partners.status })
          .from(schema.partners)
          .where(eq(schema.partners.userId, parsed.data.partnerId))
          .limit(1)
          .for("update");
        if (!partner) return "missing" as const;
        if (partner.status !== "verified") return "not_verified" as const;
        await tx
          .update(schema.partners)
          .set({ status: "pending", verifiedBy: null, verifiedAt: null })
          .where(eq(schema.partners.userId, parsed.data.partnerId));
        await tx.insert(schema.auditLog).values({
          actorId: adminId,
          actorEmail: adminEmail,
          action: "partner.revoke",
          entityType: "partner",
          entityId: parsed.data.partnerId,
          before: { status: partner.status },
          after: { status: "pending" },
        });
        return "revoked" as const;
      });
      if (outcome === "missing") return { error: "Referral Partner not found." };
      if (outcome === "not_verified") {
        return {
          error:
            "This Referral Partner is no longer verified. Reload before taking another action.",
        };
      }
      revalidatePath(`/partners/${parsed.data.partnerId}`);
      revalidatePath("/partners");
      return { ok: true };
    },
  );
}

const rejectSchema = z.object({
  partnerId: z.string().min(1),
  reason: z.string().trim().min(1, "Enter a rejection reason.").max(500),
});

export async function rejectPartnerAction(
  _prev: PartnerReviewResult,
  formData: FormData,
): Promise<PartnerReviewResult> {
  return withPartnerAdminAction<PartnerReviewResult>(
    "partner_rejection_failed",
    { error: UNKNOWN_REJECTION_OUTCOME, uncertain: true },
    async ({ db, ctx, env, isAdmin, adminId, adminEmail }) => {
      if (!isAdmin || !adminId) return { error: "Not authorized." };
      const parsed = rejectSchema.safeParse(Object.fromEntries(formData));
      if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Invalid rejection request." };
      }
      const reason = parsed.data.reason;
      const outcome = await db.transaction(async (tx) => {
        const [partner] = await tx
          .select({
            status: schema.partners.status,
            submittedAt: schema.partners.submittedAt,
          })
          .from(schema.partners)
          .where(eq(schema.partners.userId, parsed.data.partnerId))
          .limit(1)
          .for("update");
        if (!partner) return { kind: "missing" } as const;
        const refusal = partnerRejectionRefusal(partner);
        if (refusal) return { kind: "refused", error: refusal } as const;
        const now = new Date();
        await tx
          .update(schema.partners)
          .set({
            status: "rejected",
            verifiedBy: adminId,
            verifiedAt: now,
            rejectionReason: reason,
          })
          .where(eq(schema.partners.userId, parsed.data.partnerId));
        await tx.insert(schema.auditLog).values({
          actorId: adminId,
          actorEmail: adminEmail,
          action: "partner.reject",
          entityType: "partner",
          entityId: parsed.data.partnerId,
          before: { status: partner.status },
          after: { status: "rejected", reason, rejectedAt: now.toISOString() },
        });
        return { kind: "rejected" } as const;
      });
      if (outcome.kind === "missing") return { error: "Referral Partner not found." };
      if (outcome.kind === "refused") return { error: outcome.error };
      const contact = await partnerContact(db, parsed.data.partnerId);
      if (contact) {
        scheduleAdminBackgroundTask(ctx, "partner_rejection_notification_failed", () =>
          notifyPartnerDecision(env, {
            to: contact.email,
            name: contact.name,
            decision: "rejected",
            reason,
            loginUrl: `${env.PARTNERS_URL}/login`,
          }),
        );
      }
      revalidatePath(`/partners/${parsed.data.partnerId}`);
      revalidatePath("/partners");
      return { ok: true };
    },
  );
}

const payoutSchema = z.object({
  partnerId: z.string().min(1),
  kind: z.enum(schema.payoutKind.enumValues),
  amount: z.string().min(1),
  note: z.string().trim().max(500).optional(),
});

export async function recordPayoutAction(
  _prev: PayoutResult,
  formData: FormData,
): Promise<PayoutResult> {
  return withPartnerAdminAction<PayoutResult>(
    "partner_payout_record_failed",
    { error: UNKNOWN_PAYOUT_OUTCOME, uncertain: true },
    async ({ db, isAdmin, adminId, adminEmail }) => {
      if (!isAdmin || !adminId) return { error: "Not authorized." };
      const parsed = payoutSchema.safeParse(Object.fromEntries(formData));
      if (!parsed.success) return { error: "Please check the fields." };
      const amountPaise = rupeesToPaise(parsed.data.amount);
      if (amountPaise == null || amountPaise <= 0) return { error: "Enter a valid amount." };

      const result = await db.transaction(async (tx) => {
        // Lock the partner row to serialize every ledger write for this partner.
        const [partner] = await tx
          .select({ userId: schema.partners.userId })
          .from(schema.partners)
          .where(eq(schema.partners.userId, parsed.data.partnerId))
          .limit(1)
          .for("update");
        if (!partner) return { error: "Referral Partner not found." };
        const [sums] = await tx
          .select({
            earned: sql<string>`coalesce(sum(${schema.partnerPayouts.amountPaise}) filter (where ${schema.partnerPayouts.kind} = 'earned'), 0)`,
            paid: sql<string>`coalesce(sum(${schema.partnerPayouts.amountPaise}) filter (where ${schema.partnerPayouts.kind} = 'paid'), 0)`,
          })
          .from(schema.partnerPayouts)
          .where(eq(schema.partnerPayouts.partnerId, parsed.data.partnerId));
        let ledger: ReturnType<typeof normalizePartnerLedger>;
        try {
          ledger = normalizePartnerLedger(sums?.earned, sums?.paid);
        } catch (error) {
          console.error(
            JSON.stringify({
              event: "partner_ledger_total_invalid",
              errorType: error instanceof Error ? error.name : "unknown",
            }),
          );
          return { error: "This ledger balance needs review before another payment is recorded." };
        }
        if (
          parsed.data.kind === "earned" &&
          !Number.isSafeInteger(ledger.earnedPaise + amountPaise)
        ) {
          return { error: "This entry would exceed the supported ledger range." };
        }
        if (parsed.data.kind === "paid" && amountPaise > ledger.outstandingPaise) {
          return {
            error: `That exceeds the outstanding balance of ${formatPaise(Math.max(0, ledger.outstandingPaise))}.`,
          };
        }
        const [entry] = await tx
          .insert(schema.partnerPayouts)
          .values({
            partnerId: parsed.data.partnerId,
            kind: parsed.data.kind,
            amountPaise,
            note: parsed.data.note || null,
            recordedBy: adminId,
          })
          .returning({ id: schema.partnerPayouts.id });
        await tx.insert(schema.auditLog).values({
          actorId: adminId,
          actorEmail: adminEmail,
          action: "partner.ledger.record",
          entityType: "partner_payout",
          entityId: entry?.id,
          after: {
            partnerId: parsed.data.partnerId,
            kind: parsed.data.kind,
            amountPaise,
            note: parsed.data.note || null,
          },
        });
        return { ok: true };
      });
      if ("error" in result) return result;
      revalidatePath(`/partners/${parsed.data.partnerId}`);
      return { ok: true };
    },
  );
}
