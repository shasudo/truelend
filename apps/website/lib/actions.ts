"use server";

import { headers } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDb, schema } from "@truelend/db";
import { notifyNewLead } from "@truelend/email";
import { leadKindLabels, productName } from "@truelend/reference";
import { leadSchema } from "./schemas";
import { verifyTurnstile } from "./turnstile";

export type SubmitResult = { ok: true } | { ok: false; error: string };
const CONSENT_VERSION = "2026-07-13";

const blank = (v: string | undefined) => (v && v.length > 0 ? v : undefined);

async function leadRateLimitKey(
  data: {
    kind: string;
    phone?: string;
    email?: string;
    referrerPhone?: string;
  },
  ip: string,
) {
  const identity = data.phone || data.email || data.referrerPhone || "anonymous";
  // Combine identity with the edge-authenticated IP: a caller cannot exhaust a
  // victim's phone/email bucket from a different network, while the separate IP
  // bucket below still prevents rotating form identities to evade the limit.
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${ip}:${identity}`),
  );
  return `${data.kind}:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

export async function submitLead(input: unknown): Promise<SubmitResult> {
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the highlighted fields and try again." };
  }

  const { env, ctx } = getCloudflareContext();
  const requestHeaders = await headers();
  const ip = requestHeaders.get("cf-connecting-ip") ?? "anonymous";
  const hostname = requestHeaders.get("host") ?? undefined;
  const [ipLimit, identityLimit] = await Promise.all([
    env.LEAD_RATE_LIMITER.limit({ key: `ip:${ip}` }),
    env.LEAD_RATE_LIMITER.limit({ key: await leadRateLimitKey(parsed.data, ip) }),
  ]);
  if (!ipLimit.success || !identityLimit.success) {
    return { ok: false, error: "Too many requests. Please wait a minute and try again." };
  }

  const human = await verifyTurnstile(
    parsed.data.turnstileToken,
    env.TURNSTILE_SECRET_KEY,
    ip === "anonymous" ? undefined : ip,
    hostname,
  );
  if (!human) {
    return { ok: false, error: "Human verification failed — please try once more." };
  }

  const d = parsed.data;
  const db = createDb(env.HYPERDRIVE.connectionString);
  try {
    const consentAt = new Date();
    await db.transaction(async (tx) => {
      const [lead] = await tx
        .insert(schema.leads)
        .values({
          kind: d.kind,
          name: "name" in d ? blank(d.name) : undefined,
          phone: "phone" in d ? blank(d.phone) : undefined,
          email: "email" in d ? blank(d.email) : undefined,
          city: "city" in d ? blank(d.city) : undefined,
          productSlug: "productSlug" in d ? blank(d.productSlug) : undefined,
          message: "message" in d ? blank(d.message) : undefined,
          referrerName: "referrerName" in d ? blank(d.referrerName) : undefined,
          referrerPhone: "referrerPhone" in d ? blank(d.referrerPhone) : undefined,
          utmSource: blank(d.utmSource),
          utmMedium: blank(d.utmMedium),
          utmCampaign: blank(d.utmCampaign),
          consent: d.consent,
          consentAt,
          consentSource: "website_form",
          consentVersion: CONSENT_VERSION,
        })
        .returning({ id: schema.leads.id });
      await tx.insert(schema.auditLog).values({
        action: "lead.create",
        entityType: "lead",
        entityId: lead?.id,
        after: { source: "website_form", kind: d.kind, consentVersion: CONSENT_VERSION },
      });
    });
    ctx.waitUntil(
      notifyNewLead(env, {
        name: "name" in d ? d.name : undefined,
        phone: "phone" in d ? d.phone : undefined,
        email: "email" in d ? d.email : undefined,
        city: "city" in d ? d.city : undefined,
        product: "productSlug" in d && d.productSlug ? productName(d.productSlug) : undefined,
        message: "message" in d ? d.message : undefined,
        source: `Website · ${leadKindLabels[d.kind]}`,
      }),
    );
    return { ok: true };
  } catch (err) {
    console.error(
      JSON.stringify({
        event: "lead_insert_failed",
        kind: d.kind,
        error: err instanceof Error ? err.message : "unknown",
      }),
    );
    return {
      ok: false,
      error: "Something went wrong on our side. Please try again, or call us directly.",
    };
  } finally {
    ctx.waitUntil(db.$client.end());
  }
}
