"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@truelend/db";
import { normalizeIndianMobile, validationMessages, validationPatterns } from "@truelend/reference";
import { getAuthContext, requirePartner } from "./auth";

export type ProfileState = { ok?: boolean; error?: string };

const profileSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(120),
  phone: z
    .string()
    .trim()
    .transform(normalizeIndianMobile)
    .pipe(z.string().regex(validationPatterns.indianMobile, validationMessages.indianMobile)),
});

export async function updateProfileAction(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const { db, ctx } = getAuthContext();
  try {
    const { partner } = await requirePartner();
    const parsed = profileSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success)
      return { error: parsed.error.issues[0]?.message ?? "Please check the fields." };
    const d = parsed.data;
    await db.transaction(async (tx) => {
      await tx.update(schema.user).set({ name: d.name }).where(eq(schema.user.id, partner.userId));
      await tx
        .update(schema.partners)
        .set({ phone: d.phone })
        .where(eq(schema.partners.userId, partner.userId));
    });
    revalidatePath("/profile");
    revalidatePath("/dashboard");
    return { ok: true };
  } finally {
    ctx.waitUntil(db.$client.end());
  }
}
