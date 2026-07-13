"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@truelend/db";
import { getMutationContext } from "./auth";
import { rupeesToPaise } from "./format";

async function admin() {
  const { db, ctx, user } = await getMutationContext();
  return { db, ctx, isAdmin: user?.role === "admin", adminId: user?.id };
}

const idSchema = z.object({ partnerId: z.string().min(1) });

export async function approvePartnerAction(formData: FormData) {
  const { db, ctx, isAdmin, adminId } = await admin();
  if (!isAdmin || !adminId) return;
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
  const { db, ctx, isAdmin, adminId } = await admin();
  if (!isAdmin || !adminId) return;
  const parsed = rejectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  try {
    await db
      .update(schema.partners)
      .set({
        status: "rejected",
        verifiedBy: adminId,
        verifiedAt: new Date(),
        rejectionReason: parsed.data.reason || "Documents did not pass verification.",
      })
      .where(eq(schema.partners.userId, parsed.data.partnerId));
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

export async function recordPayoutAction(formData: FormData) {
  const { db, ctx, isAdmin } = await admin();
  if (!isAdmin) return;
  const parsed = payoutSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const amountPaise = rupeesToPaise(parsed.data.amount);
  if (amountPaise == null || amountPaise <= 0) return;
  try {
    await db.insert(schema.partnerPayouts).values({
      partnerId: parsed.data.partnerId,
      kind: parsed.data.kind,
      amountPaise,
      note: parsed.data.note || null,
    });
    revalidatePath(`/partners/${parsed.data.partnerId}`);
  } finally {
    ctx.waitUntil(db.$client.end());
  }
}
