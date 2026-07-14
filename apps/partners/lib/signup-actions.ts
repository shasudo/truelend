"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@truelend/db";
import { verifyTurnstile } from "@truelend/turnstile";
import { getAuthContext } from "./auth";

export type RegisterState = {
  code?: "invalid_input" | "rate_limited" | "verification_failed" | "registration_failed";
  error?: string;
};

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
    turnstileToken: z.string().max(2048).optional(),
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

export async function registerPartner(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      code: "invalid_input",
      error: parsed.error.issues[0]?.message ?? "Please check the fields.",
    };
  }
  const d = parsed.data;
  const { auth, db, ctx, env } = getAuthContext();
  let createdUserId: string | undefined;
  try {
    const requestHeaders = await headers();
    const ip = requestHeaders.get("cf-connecting-ip") ?? "anonymous";
    const emailDigest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(d.email));
    const emailKey = Array.from(new Uint8Array(emailDigest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    const [ipLimit, emailLimit] = await Promise.all([
      env.REGISTRATION_RATE_LIMITER.limit({ key: `ip:${ip}` }),
      env.REGISTRATION_RATE_LIMITER.limit({ key: `email:${emailKey}` }),
    ]);
    if (!ipLimit.success || !emailLimit.success) {
      return {
        code: "rate_limited",
        error: "Too many registration attempts. Please wait a minute and try again.",
      };
    }

    const human = await verifyTurnstile({
      token: d.turnstileToken,
      secret: env.TURNSTILE_SECRET_KEY,
      siteKeyConfigured: Boolean(env.TURNSTILE_SITE_KEY),
      expectedAction: "partner_registration",
      ip: ip === "anonymous" ? undefined : ip,
      expectedHostname: requestHeaders.get("host") ?? undefined,
    });
    if (!human) {
      return {
        code: "verification_failed",
        error: "Human verification failed. Please try again.",
      };
    }

    const res = await auth.api.signUpEmail({
      body: { name: d.name, email: d.email, password: d.password },
      headers: requestHeaders,
    });
    createdUserId = res.user.id;
    await db.transaction(async (tx) => {
      await tx.update(schema.user).set({ role: d.type }).where(eq(schema.user.id, createdUserId!));
      // Reference id is generated in-DB from the sequence so it's race-free and
      // gapless; prefix (BP/RP) is a controlled constant, not user input.
      const prefix = d.type === "business" ? "BP" : "RP";
      await tx.insert(schema.partners).values({
        userId: createdUserId!,
        type: d.type,
        status: "pending",
        referenceId: sql`${prefix} || lpad(nextval('partners_reference_seq')::text, 6, '0')`,
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
  } catch (error) {
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
    console.error(
      JSON.stringify({
        event: "partner_registration_failed",
        cleanupAttempted: Boolean(createdUserId),
        error: error instanceof Error ? error.message : "unknown",
      }),
    );
    return {
      code: "registration_failed",
      // Deliberately identical for an existing email and internal failures.
      error: "Could not create the account. Check your details or try again later.",
    };
  } finally {
    ctx.waitUntil(db.$client.end());
  }
  redirect("/dashboard");
}
