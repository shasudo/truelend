"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@truelend/db";
import { getAuthContext } from "./auth";
import { isApplicationComplete, kycEditable } from "./onboarding";

const LOCKED_MSG =
  "Your KYC is locked while it's under review or after verification. Contact us to make changes.";

export type KycState = { ok?: boolean; error?: string };

const upper = (s: string) => s.trim().toUpperCase();

const kycSchema = z.object({
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
  accountHolder: z.string().trim().min(2, "Enter the account holder name").max(160),
  accountNumber: z
    .string()
    .trim()
    .regex(/^\d{9,18}$/, "Enter a valid account number"),
  ifsc: z
    .string()
    .transform(upper)
    .pipe(z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Enter a valid IFSC (e.g. HDFC0001234)")),
});

/** Save the partner's KYC details (PAN/GST/address/bank) — the text half of
 *  onboarding, collected before/alongside the document uploads. */
export async function savePartnerKyc(_prev: KycState, formData: FormData): Promise<KycState> {
  const { db, ctx, auth } = getAuthContext();
  try {
    const session = await auth.api.getSession({ headers: await headers() });
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
      if (!kycEditable(partner)) return "locked" as const;
      await tx
        .update(schema.partners)
        .set({
          pan: d.pan,
          gst: d.gst && d.gst.length > 0 ? d.gst : null,
          address: d.address,
          accountHolder: d.accountHolder,
          accountNumber: d.accountNumber,
          ifsc: d.ifsc,
        })
        .where(eq(schema.partners.userId, session.user.id));
      await tx.insert(schema.auditLog).values({
        actorId: session.user.id,
        actorEmail: session.user.email,
        action: "partner.kyc_details_update",
        entityType: "partner",
        entityId: session.user.id,
        // Never copy PAN or bank values into the generic audit trail.
        after: { fields: ["pan", "gst", "address", "accountHolder", "accountNumber", "ifsc"] },
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

/** Submit the completed application for review → redirect to the review screen. */
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
      if (!partner || !kycEditable(partner)) return;
      const docs = await tx
        .select({ docType: schema.partnerDocuments.docType })
        .from(schema.partnerDocuments)
        .where(eq(schema.partnerDocuments.partnerId, partner.userId));
      const uploaded = new Set(docs.map((document) => document.docType));
      if (!isApplicationComplete(partner, uploaded)) return;
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

/** Reopen a submitted application for editing (partner-initiated). */
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
