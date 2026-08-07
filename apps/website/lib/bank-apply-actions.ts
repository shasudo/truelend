"use server";

import { cookies, headers } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDb, schema } from "@truelend/db";
import { bankApplyProductForSlug, customerConsentVersion } from "@truelend/reference";
import { verifyTurnstile } from "@truelend/turnstile/server";
import { REF_COOKIE, sanitizeRef } from "./attribution";
import { scheduleWebsiteBackgroundTask } from "./background-task";
import { bankApplySchema } from "./bank-apply-schemas";
import { resolvePartnerByRef } from "./partner-lookup";

type BankApplyResult = { ok: true; redirectUrl: string } | { ok: false; error: string };

// Small enough that a handful of retries is cheaper than a wider code, and a
// collision is still astronomically rare at 10^8 combinations.
const TRACKING_CODE_ATTEMPTS = 5;

function generateTrackingCode(): string {
  const value = crypto.getRandomValues(new Uint32Array(1))[0]! % 100_000_000;
  return String(value).padStart(8, "0");
}

// Scoped to this one constraint, not "any unique violation in the
// transaction" — a collision elsewhere (e.g. a future migration adding
// another unique column here) is a real integrity conflict, not something a
// fresh tracking-code candidate would ever fix by retrying.
function isTrackingCodeCollision(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "23505" &&
    "constraint_name" in error &&
    error.constraint_name === "bank_apply_leads_tracking_code_unique",
  );
}

async function bankApplyRateLimitKey(phone: string, ip: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${ip}:${phone}`));
  return `bank_apply:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

export async function startBankApply(input: unknown): Promise<BankApplyResult> {
  const parsed = bankApplySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the highlighted fields and try again." };
  }
  const d = parsed.data;
  const product = bankApplyProductForSlug(d.productSlug);
  if (!product) {
    return { ok: false, error: "That product is no longer available." };
  }
  // Non-trackable products (a static DSA-channel link) have nowhere to send a
  // tracking code and no bank_apply_leads row to create — this is the actual
  // gate, not just the client's redirect shortcut, so a direct call can't
  // force one to be written.
  if (!product.trackable) {
    return { ok: true, redirectUrl: product.buildApplyUrl("") };
  }

  try {
    const { env, ctx } = getCloudflareContext();
    const requestHeaders = await headers();
    const ip = requestHeaders.get("cf-connecting-ip") ?? "anonymous";
    const hostname = requestHeaders.get("host") ?? undefined;
    const [ipLimit, phoneLimit] = await Promise.all([
      env.LEAD_RATE_LIMITER.limit({ key: `ip:${ip}` }),
      env.LEAD_RATE_LIMITER.limit({ key: await bankApplyRateLimitKey(d.phone, ip) }),
    ]);
    if (!ipLimit.success || !phoneLimit.success) {
      return { ok: false, error: "Too many requests. Please wait a minute and try again." };
    }

    const human = await verifyTurnstile({
      token: d.turnstileToken,
      secret: env.TURNSTILE_SECRET_KEY,
      siteKeyConfigured: Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY),
      expectedAction: "bank_apply_start",
      ip: ip === "anonymous" ? undefined : ip,
      expectedHostname: hostname,
      production: process.env.NODE_ENV === "production",
    });
    if (!human) {
      return { ok: false, error: "Human verification failed — please try once more." };
    }

    const db = createDb(env.HYPERDRIVE.connectionString);
    try {
      // Same attribution resolution as submitLead: cookie first (banked by
      // middleware on every ?ref= hit), client-supplied ref as fallback.
      const refCode = sanitizeRef((await cookies()).get(REF_COOKIE)?.value) ?? sanitizeRef(d.ref);
      const { partner, refLookupFailed } = await resolvePartnerByRef(db, refCode, "bank_apply");
      if (refCode && !partner && !refLookupFailed) {
        console.error(JSON.stringify({ event: "bank_apply_partner_ref_unresolved", ref: refCode }));
      }
      const partnerId = partner?.userId;
      const consentAt = new Date();

      let trackingCode: string | undefined;
      for (let attempt = 0; attempt < TRACKING_CODE_ATTEMPTS && !trackingCode; attempt += 1) {
        const candidate = generateTrackingCode();
        try {
          await db.transaction(async (tx) => {
            const [row] = await tx
              .insert(schema.bankApplyLeads)
              .values({
                trackingCode: candidate,
                productSlug: d.productSlug,
                partnerId,
                phone: d.phone,
                consent: d.consent,
                consentAt,
                consentSource: "qr_quick_apply",
                consentVersion: customerConsentVersion,
              })
              .returning({ id: schema.bankApplyLeads.id });
            await tx.insert(schema.auditLog).values({
              action: "bank_apply_lead.create",
              entityType: "bank_apply_lead",
              entityId: row?.id,
              after: {
                source: partnerId
                  ? "referral_partner_qr"
                  : refCode
                    ? "unresolved_referral_partner_qr"
                    : "direct",
                productSlug: d.productSlug,
                partnerRef: refCode,
                partnerResolved: refCode ? Boolean(partnerId) : undefined,
                partnerLookupFailed: refLookupFailed || undefined,
                consentVersion: customerConsentVersion,
              },
            });
          });
          trackingCode = candidate;
        } catch (error) {
          // Only a collision on the tracking code is worth retrying with a
          // fresh candidate — anything else is a real failure.
          if (!isTrackingCodeCollision(error)) throw error;
        }
      }
      if (!trackingCode) {
        console.error(JSON.stringify({ event: "bank_apply_tracking_code_exhausted" }));
        return { ok: false, error: "Something went wrong on our side. Please try again." };
      }

      return { ok: true, redirectUrl: product.buildApplyUrl(trackingCode) };
    } finally {
      scheduleWebsiteBackgroundTask(ctx, "website_bank_apply_context_cleanup_failed", () =>
        db.$client.end(),
      );
    }
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "bank_apply_failed",
        errorType: error instanceof Error ? error.name : "unknown",
      }),
    );
    return { ok: false, error: "Something went wrong on our side. Please try again." };
  }
}
