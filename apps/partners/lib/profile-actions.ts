"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@truelend/db";
import { normalizeIndianMobile, validationMessages, validationPatterns } from "@truelend/reference";
import { reportPartnerActionFailure } from "./action-errors";
import { withPartnerMutation } from "./auth";

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
  try {
    return await withPartnerMutation(async ({ db, session, partner }) => {
      if (!session) return { error: "Please sign in again." };
      if (!partner) return { error: "Please finish your Referral Partner registration." };
      const parsed = profileSchema.safeParse(Object.fromEntries(formData));
      if (!parsed.success)
        return { error: parsed.error.issues[0]?.message ?? "Please check the fields." };
      const d = parsed.data;
      const updated = await db.transaction(async (tx) => {
        const [current] = await tx
          .select({ userId: schema.partners.userId })
          .from(schema.partners)
          .where(eq(schema.partners.userId, partner.userId))
          .limit(1)
          .for("update");
        if (!current) return false;
        await tx
          .update(schema.user)
          .set({ name: d.name })
          .where(eq(schema.user.id, partner.userId));
        await tx
          .update(schema.partners)
          .set({ phone: d.phone })
          .where(eq(schema.partners.userId, partner.userId));
        await tx.insert(schema.auditLog).values({
          actorId: session.user.id,
          actorEmail: session.user.email,
          action: "partner.profile_update",
          entityType: "partner",
          entityId: partner.userId,
          after: { fields: ["name", "phone"] },
        });
        return true;
      });
      if (!updated) return { error: "Your Referral Partner profile could not be found." };
      revalidatePath("/profile");
      revalidatePath("/dashboard");
      return { ok: true };
    });
  } catch (error) {
    reportPartnerActionFailure("partner_profile_update_failed", error);
    return {
      error:
        "We couldn't confirm the profile update. Refresh this page to check before trying again.",
    };
  }
}
