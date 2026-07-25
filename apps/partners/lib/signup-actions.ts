"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@truelend/db";
import { notifyPartnerRegistration } from "@truelend/email";
import { verifyTurnstile } from "@truelend/turnstile/server";
import {
  normalizeIndianMobile,
  referralTypeValues,
  validationMessages,
  validationPatterns,
} from "@truelend/reference";
import { getAuthContext } from "./auth";
import {
  registrationAccountDecision,
  registrationStepForIssue,
  registrationValuesFromSubmission,
  type RegistrationErrorCode,
  type RegistrationFormValues,
  type RegistrationStep,
} from "./registration-flow";

export type RegisterState = {
  code?: RegistrationErrorCode;
  error?: string;
  step?: RegistrationStep;
  values?: RegistrationFormValues;
};

const profileSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(120),
  dateOfBirth: z
    .string()
    .date("Enter a valid date of birth")
    .refine((value) => new Date(`${value}T00:00:00Z`).getTime() < Date.now(), {
      message: "Date of birth must be in the past",
    }),
  referralType: z.enum(referralTypeValues),
  city: z.string().trim().min(2, "Please select your city").max(100),
  pan: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .pipe(
      z
        .string()
        .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Enter a valid PAN (e.g. ABCDE1234F)")
        .or(z.literal("")),
    ),
  experienceNote: z.string().trim().max(80).optional().default(""),
  phone: z
    .string()
    .trim()
    .transform(normalizeIndianMobile)
    .pipe(z.string().regex(validationPatterns.indianMobile, validationMessages.indianMobile)),
  turnstileToken: z.string().max(2048).optional(),
});

const registerSchema = profileSchema.extend({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email").max(254)),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export async function registerPartner(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const { auth, db, ctx, env } = getAuthContext();
  let createdUserId: string | undefined;
  let accountCreatedInRequest = false;
  let registrationComplete = false;
  let requestHadSession = false;
  let submittedValues: RegistrationFormValues | undefined;
  let failureStage: "request" | "account_creation" | "profile_creation" = "request";
  try {
    const requestHeaders = await headers();
    const session = await auth.api.getSession({ headers: requestHeaders });
    requestHadSession = Boolean(session);
    const submitted = Object.fromEntries(formData);
    submittedValues = registrationValuesFromSubmission(submitted, !session);
    let profile: z.infer<typeof profileSchema>;
    let newAccount: { email: string; password: string } | undefined;

    if (session) {
      const parsed = profileSchema.safeParse(submitted);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        return {
          code: "invalid_input",
          error: issue?.message ?? "Please check the fields.",
          step: registrationStepForIssue(issue?.path ?? []),
          values: submittedValues,
        };
      }
      profile = parsed.data;
    } else {
      const parsed = registerSchema.safeParse(submitted);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        return {
          code: "invalid_input",
          error: issue?.message ?? "Please check the fields.",
          step: registrationStepForIssue(issue?.path ?? []),
          values: submittedValues,
        };
      }
      profile = parsed.data;
      newAccount = { email: parsed.data.email, password: parsed.data.password };
    }

    const accountEmail = session?.user.email ?? newAccount!.email;
    const ip = requestHeaders.get("cf-connecting-ip") ?? "anonymous";
    const emailDigest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(accountEmail),
    );
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
        step: 3,
        values: submittedValues,
      };
    }

    const human = await verifyTurnstile({
      token: profile.turnstileToken,
      secret: env.TURNSTILE_SECRET_KEY,
      siteKeyConfigured: Boolean(env.TURNSTILE_SITE_KEY),
      expectedAction: "partner_registration",
      ip: ip === "anonymous" ? undefined : ip,
      expectedHostname: requestHeaders.get("host") ?? undefined,
      production: process.env.NODE_ENV === "production",
    });
    if (!human) {
      return {
        code: "verification_failed",
        error: "Human verification failed. Please try again.",
        step: 3,
        values: submittedValues,
      };
    }

    if (session) {
      createdUserId = session.user.id;
    } else {
      failureStage = "account_creation";
      const res = await auth.api.signUpEmail({
        body: { name: profile.name, email: newAccount!.email, password: newAccount!.password },
        headers: requestHeaders,
      });
      createdUserId = res.user.id;
      accountCreatedInRequest = true;
    }

    failureStage = "profile_creation";
    const outcome = await db.transaction(async (tx) => {
      const [account] = await tx
        .select({
          email: schema.user.email,
          role: schema.user.role,
        })
        .from(schema.user)
        .where(eq(schema.user.id, createdUserId!))
        .limit(1)
        .for("update");
      const [existingPartner] = await tx
        .select({ userId: schema.partners.userId })
        .from(schema.partners)
        .where(eq(schema.partners.userId, createdUserId!))
        .limit(1);

      if (!account) return { kind: "ineligible" } as const;
      const accountDecision = registrationAccountDecision(account.role, Boolean(existingPartner));
      if (accountDecision === "existing") {
        return { kind: "existing" } as const;
      }
      if (accountDecision === "ineligible") {
        return { kind: "ineligible" } as const;
      }

      await tx
        .update(schema.user)
        .set({ name: profile.name, role: "referral" })
        .where(eq(schema.user.id, createdUserId!));
      // The database sequence makes the reference id unique under concurrency.
      // Sequence gaps after failed transactions are expected and harmless.
      const [createdPartner] = await tx
        .insert(schema.partners)
        .values({
          userId: createdUserId!,
          status: "pending",
          referenceId: sql`'RP' || lpad(nextval('partners_reference_seq')::text, 6, '0')`,
          phone: profile.phone,
          dateOfBirth: profile.dateOfBirth,
          city: profile.city,
          referralType: profile.referralType,
          pan: profile.pan || null,
          experienceNote: profile.experienceNote || null,
        })
        .returning({ referenceId: schema.partners.referenceId });
      await tx.insert(schema.auditLog).values({
        actorId: createdUserId,
        actorEmail: account.email,
        action: "partner.register",
        entityType: "partner",
        entityId: createdUserId,
        after: { program: "referral", status: "pending" },
      });
      return {
        kind: "created",
        email: account.email,
        referenceId: createdPartner?.referenceId,
      } as const;
    });

    if (outcome.kind === "ineligible") {
      if (session) {
        return {
          code: "account_conflict",
          error: "This signed-in account cannot be used for Referral Partner registration.",
          step: 3,
          values: submittedValues,
        };
      }
      throw new Error("New account was not eligible for profile creation");
    }

    registrationComplete = true;
    if (outcome.kind === "created" && outcome.referenceId) {
      ctx.waitUntil(
        notifyPartnerRegistration(env, {
          to: outcome.email,
          name: profile.name,
          referenceId: outcome.referenceId,
          dashboardUrl: `${env.BETTER_AUTH_URL}/dashboard`,
        }),
      );
    }
  } catch (error) {
    // better-auth owns signup and therefore cannot share the application
    // transaction. Compensate if our role/profile transaction fails.
    let cleanupSucceeded: boolean | undefined;
    if (createdUserId && accountCreatedInRequest && !registrationComplete) {
      try {
        await db.delete(schema.user).where(eq(schema.user.id, createdUserId));
        cleanupSucceeded = true;
      } catch (cleanupError) {
        cleanupSucceeded = false;
        console.error(
          JSON.stringify({
            event: "partner_registration_cleanup_failed",
            errorType: cleanupError instanceof Error ? cleanupError.name : "unknown",
          }),
        );
      }
    }
    console.error(
      JSON.stringify({
        event: "partner_registration_failed",
        cleanupAttempted: Boolean(createdUserId && accountCreatedInRequest),
        cleanupSucceeded,
        failureStage,
        errorType: error instanceof Error ? error.name : "unknown",
      }),
    );
    if (requestHadSession) {
      return {
        code: "service_unavailable",
        error: "We could not finish your profile right now. Your account is unchanged. Try again.",
        step: 3,
        values: submittedValues,
      };
    }
    return {
      code: "registration_failed",
      // Deliberately identical for an existing email and internal failures.
      error: "We could not complete the registration. Review your options below.",
      step: 3,
      values: submittedValues,
    };
  } finally {
    ctx.waitUntil(db.$client.end());
  }
  redirect("/dashboard");
}
