"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { schema, type Database } from "@truelend/db";
import { notifyPartnerDecision } from "@truelend/email";
import { getAuthContext, getMutationContext } from "./auth";
import { formatPaise, partnerDocTypes, rupeesToPaise } from "@truelend/reference";

export type PayoutResult = { ok?: boolean; error?: string };

async function admin() {
  const { db, ctx, user } = await getMutationContext();
  const { env } = getAuthContext();
  return {
    db,
    ctx,
    env,
    isAdmin: user?.role === "admin",
    adminId: user?.id,
    adminEmail: user?.email,
  };
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
type DocType = (typeof schema.partnerDocType.enumValues)[number];
const requiredDocTypes = partnerDocTypes
  .filter((doc) => doc.required)
  .map((doc) => doc.type) as DocType[];

export async function approvePartnerAction(formData: FormData) {
  const { db, ctx, env, isAdmin, adminId, adminEmail } = await admin();
  try {
    if (!isAdmin || !adminId) redirect("/login");
    const parsed = idSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return;
    const approved = await db.transaction(async (tx) => {
      const [partner] = await tx
        .select()
        .from(schema.partners)
        .where(eq(schema.partners.userId, parsed.data.partnerId))
        .limit(1)
        .for("update");
      if (!partner || partner.status === "verified" || !partner.submittedAt) return false;
      const docs = await tx
        .select({ docType: schema.partnerDocuments.docType })
        .from(schema.partnerDocuments)
        .where(eq(schema.partnerDocuments.partnerId, parsed.data.partnerId));
      const uploaded = new Set(docs.map((doc) => doc.docType));
      const detailsComplete = Boolean(
        partner.pan &&
        partner.address &&
        partner.accountHolder &&
        partner.accountNumber &&
        partner.ifsc,
      );
      if (!detailsComplete || !requiredDocTypes.every((docType) => uploaded.has(docType))) {
        return false;
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
      return true;
    });
    if (!approved) return;
    const contact = await partnerContact(db, parsed.data.partnerId);
    if (contact) {
      ctx.waitUntil(
        notifyPartnerDecision(env, {
          to: contact.email,
          name: contact.name,
          decision: "verified",
          loginUrl: `${env.PARTNERS_URL ?? ""}/login`,
        }),
      );
    }
    revalidatePath(`/partners/${parsed.data.partnerId}`);
    revalidatePath("/partners");
  } finally {
    ctx.waitUntil(db.$client.end());
  }
}

export async function revokePartnerAction(formData: FormData) {
  const { db, ctx, isAdmin, adminId, adminEmail } = await admin();
  try {
    if (!isAdmin || !adminId) redirect("/login");
    const parsed = idSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return;
    // Back to pending: an accidental approval must be reversible from the UI.
    await db.transaction(async (tx) => {
      const [partner] = await tx
        .select({ status: schema.partners.status })
        .from(schema.partners)
        .where(eq(schema.partners.userId, parsed.data.partnerId))
        .limit(1)
        .for("update");
      if (!partner || partner.status !== "verified") return;
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
    });
    revalidatePath(`/partners/${parsed.data.partnerId}`);
    revalidatePath("/partners");
  } finally {
    ctx.waitUntil(db.$client.end());
  }
}

const rejectSchema = z.object({
  partnerId: z.string().min(1),
  reason: z.string().trim().min(1, "Enter a rejection reason.").max(500),
});

export async function rejectPartnerAction(formData: FormData) {
  const { db, ctx, env, isAdmin, adminId, adminEmail } = await admin();
  try {
    if (!isAdmin || !adminId) redirect("/login");
    const parsed = rejectSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return;
    const reason = parsed.data.reason;
    const rejected = await db.transaction(async (tx) => {
      const [partner] = await tx
        .select({ status: schema.partners.status })
        .from(schema.partners)
        .where(eq(schema.partners.userId, parsed.data.partnerId))
        .limit(1)
        .for("update");
      if (!partner || partner.status === "verified") return false;
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
      return true;
    });
    if (!rejected) return;
    const contact = await partnerContact(db, parsed.data.partnerId);
    if (contact) {
      ctx.waitUntil(
        notifyPartnerDecision(env, {
          to: contact.email,
          name: contact.name,
          decision: "rejected",
          reason,
          loginUrl: `${env.PARTNERS_URL ?? ""}/login`,
        }),
      );
    }
    revalidatePath(`/partners/${parsed.data.partnerId}`);
    revalidatePath("/partners");
  } finally {
    ctx.waitUntil(db.$client.end());
  }
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
  const { db, ctx, isAdmin, adminId, adminEmail } = await admin();
  try {
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
      if (!partner) return { error: "Partner not found." };
      if (parsed.data.kind === "paid") {
        const [sums] = await tx
          .select({
            earned: sql<string>`coalesce(sum(${schema.partnerPayouts.amountPaise}) filter (where ${schema.partnerPayouts.kind} = 'earned'), 0)`,
            paid: sql<string>`coalesce(sum(${schema.partnerPayouts.amountPaise}) filter (where ${schema.partnerPayouts.kind} = 'paid'), 0)`,
          })
          .from(schema.partnerPayouts)
          .where(eq(schema.partnerPayouts.partnerId, parsed.data.partnerId));
        const outstanding = Number(sums?.earned ?? 0) - Number(sums?.paid ?? 0);
        if (amountPaise > outstanding) {
          return {
            error: `That exceeds the outstanding balance of ${formatPaise(Math.max(0, outstanding))}.`,
          };
        }
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
  } finally {
    ctx.waitUntil(db.$client.end());
  }
}
