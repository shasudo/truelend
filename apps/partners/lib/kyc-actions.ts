"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@truelend/db";
import { getAuthContext } from "./auth";

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
  address: z.string().trim().min(10, "Enter your full address"),
  accountHolder: z.string().trim().min(2, "Enter the account holder name"),
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
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Please sign in again." };

  const parsed = kycSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Please check the fields." };
  const d = parsed.data;

  try {
    await db
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
    revalidatePath("/dashboard");
    revalidatePath("/kyc");
    return { ok: true };
  } finally {
    ctx.waitUntil(db.$client.end());
  }
}
