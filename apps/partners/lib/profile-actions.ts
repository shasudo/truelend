"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@truelend/db";
import { getAuthContext } from "./auth";

export type ProfileState = { ok?: boolean; error?: string };

// Same 10-digit Indian mobile rule as registration/leads (can't import the const
// from a "use server" module, which may only export async functions).
const profileSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(120),
  phone: z
    .string()
    .trim()
    .transform((s) => s.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number")),
});

export async function updateProfileAction(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const { db, ctx, auth } = getAuthContext();
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { error: "Please sign in again." };
    const parsed = profileSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success)
      return { error: parsed.error.issues[0]?.message ?? "Please check the fields." };
    const d = parsed.data;
    await db.transaction(async (tx) => {
      await tx.update(schema.user).set({ name: d.name }).where(eq(schema.user.id, session.user.id));
      await tx
        .update(schema.partners)
        .set({ phone: d.phone })
        .where(eq(schema.partners.userId, session.user.id));
    });
    revalidatePath("/profile");
    revalidatePath("/dashboard");
    return { ok: true };
  } finally {
    ctx.waitUntil(db.$client.end());
  }
}
