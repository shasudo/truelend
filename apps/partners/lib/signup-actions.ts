"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@truelend/db";
import { getAuthContext } from "./auth";

export type RegisterState = { error?: string };

const registerSchema = z
  .object({
    type: z.enum(["business", "referral"]),
    name: z.string().trim().min(2, "Please enter your name").max(120),
    email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email").max(254)),
    phone: z
      .string()
      .trim()
      .transform((s) => s.replace(/[\s-]/g, ""))
      .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number")),
    password: z.string().min(8, "Password must be at least 8 characters").max(128),
    businessName: z.string().trim().max(160).optional(),
  })
  .superRefine((data, context) => {
    if (data.type === "business" && !data.businessName) {
      context.addIssue({
        code: "custom",
        path: ["businessName"],
        message: "Enter your business or firm name",
      });
    }
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
  let createdUserId: string | undefined;
  try {
    const res = await auth.api.signUpEmail({
      body: { name: d.name, email: d.email, password: d.password },
      headers: await headers(),
    });
    createdUserId = res.user.id;
    await db.transaction(async (tx) => {
      await tx.update(schema.user).set({ role: d.type }).where(eq(schema.user.id, createdUserId!));
      await tx.insert(schema.partners).values({
        userId: createdUserId!,
        type: d.type,
        status: "pending",
        phone: d.phone,
        businessName: d.type === "business" ? d.businessName! : null,
      });
      await tx.insert(schema.auditLog).values({
        actorId: createdUserId,
        actorEmail: d.email,
        action: "partner.register",
        entityType: "partner",
        entityId: createdUserId,
        after: { type: d.type, status: "pending" },
      });
    });
  } catch (err) {
    // better-auth owns signup and therefore cannot share the application
    // transaction. Compensate if our role/profile transaction fails.
    if (createdUserId) {
      try {
        await db.delete(schema.user).where(eq(schema.user.id, createdUserId));
      } catch (cleanupError) {
        console.error(
          JSON.stringify({
            event: "partner_registration_cleanup_failed",
            userId: createdUserId,
            error: cleanupError instanceof Error ? cleanupError.message : "unknown",
          }),
        );
      }
    }
    return {
      error: (err as Error).message || "Could not register — this email may already exist.",
    };
  } finally {
    ctx.waitUntil(db.$client.end());
  }
  redirect("/dashboard");
}
