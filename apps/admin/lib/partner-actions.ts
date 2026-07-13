"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { schema, type Database } from "@truelend/db";
import { notifyPartnerDecision } from "@truelend/email";
import { getAuthContext, getMutationContext } from "./auth";
import { formatPaise, rupeesToPaise } from "@truelend/reference";

export type PayoutResult = { ok?: boolean; error?: string };

async function admin() {
  const { db, ctx, user } = await getMutationContext();
  const { env } = getAuthContext();
  return { db, ctx, env, isAdmin: user?.role === "admin", adminId: user?.id };
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

export async function approvePartnerAction(formData: FormData) {
  const { db, ctx, env, isAdmin, adminId } = await admin();
  if (!isAdmin || !adminId) redirect("/login");
  const parsed = idSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  try {
    await db
      .update(schema.partners)
      .set({
        status: "verified",
        verifiedBy: adminId,
        verifiedAt: new Date(),
        rejectionReason: null,
      })
      .where(eq(schema.partners.userId, parsed.data.partnerId));
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
  const { db, ctx, isAdmin } = await admin();
  if (!isAdmin) redirect("/login");
  const parsed = idSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  try {
    // Back to pending: an accidental approval must be reversible from the UI.
    await db
      .update(schema.partners)
      .set({ status: "pending", verifiedBy: null, verifiedAt: null })
      .where(eq(schema.partners.userId, parsed.data.partnerId));
    revalidatePath(`/partners/${parsed.data.partnerId}`);
    revalidatePath("/partners");
  } finally {
    ctx.waitUntil(db.$client.end());
  }
}

const rejectSchema = z.object({
  partnerId: z.string().min(1),
  reason: z.string().trim().max(500).optional(),
});

export async function rejectPartnerAction(formData: FormData) {
  const { db, ctx, env, isAdmin, adminId } = await admin();
  if (!isAdmin || !adminId) redirect("/login");
  const parsed = rejectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const reason = parsed.data.reason || "Documents did not pass verification.";
  try {
    await db
      .update(schema.partners)
      .set({
        status: "rejected",
        verifiedBy: adminId,
        verifiedAt: new Date(),
        rejectionReason: reason,
      })
      .where(eq(schema.partners.userId, parsed.data.partnerId));
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
  const { db, ctx, isAdmin } = await admin();
  if (!isAdmin) return { error: "Not authorized." };
  const parsed = payoutSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Please check the fields." };
  const amountPaise = rupeesToPaise(parsed.data.amount);
  if (amountPaise == null || amountPaise <= 0) return { error: "Enter a valid amount." };
  try {
    if (parsed.data.kind === "paid") {
      // Never pay out more than earned-minus-already-paid. The ledger is
      // append-only, so this sum is the whole truth. ponytail: this read +
      // insert isn't atomic — two concurrent "paid" entries could both pass;
      // add a per-partner lock or a ledger balance-check constraint if payouts
      // ever get recorded concurrently.
      const [sums] = await db
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
    await db.insert(schema.partnerPayouts).values({
      partnerId: parsed.data.partnerId,
      kind: parsed.data.kind,
      amountPaise,
      note: parsed.data.note || null,
    });
    revalidatePath(`/partners/${parsed.data.partnerId}`);
    return { ok: true };
  } finally {
    ctx.waitUntil(db.$client.end());
  }
}
