"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@truelend/db";
import { getAuthContext } from "./auth";

export type RegisterState = { error?: string };

const registerSchema = z.object({
  type: z.enum(["business", "referral"]),
  name: z.string().trim().min(2, "Please enter your name"),
  email: z.email("Enter a valid email"),
  phone: z
    .string()
    .trim()
    .transform((s) => s.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number")),
  password: z.string().min(8, "Password must be at least 8 characters"),
  businessName: z.string().trim().optional(),
});

/*
 * Atomic partner registration: create the auth user (nextCookies() sets the
 * session cookie), mirror the type onto the user's role, and insert a pending
 * partner profile. They land on /dashboard, which shows the pending screen
 * until an admin verifies them.
 */
export async function registerPartner(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the fields." };
  }
  const d = parsed.data;
  const { auth, db, ctx } = getAuthContext();
  try {
    const res = await auth.api.signUpEmail({
      body: { name: d.name, email: d.email, password: d.password },
      headers: await headers(),
    });
    const userId = res.user.id;
    await db.update(schema.user).set({ role: d.type }).where(eq(schema.user.id, userId));
    await db.insert(schema.partners).values({
      userId,
      type: d.type,
      status: "pending",
      phone: d.phone,
      businessName: d.type === "business" ? d.businessName || null : null,
    });
  } catch (err) {
    return {
      error: (err as Error).message || "Could not register — this email may already exist.",
    };
  } finally {
    ctx.waitUntil(db.$client.end());
  }
  redirect("/dashboard");
}
