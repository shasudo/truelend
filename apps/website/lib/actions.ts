"use server";

import { headers } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDb, schema } from "@truelend/db";
import { leadSchema } from "./schemas";
import { verifyTurnstile } from "./turnstile";

export type SubmitResult = { ok: true } | { ok: false; error: string };

const blank = (v: string | undefined) => (v && v.length > 0 ? v : undefined);

/** Single entry point for all four website forms. Never throws. */
export async function submitLead(input: unknown): Promise<SubmitResult> {
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the highlighted fields and try again." };
  }

  const { env, ctx } = getCloudflareContext();
  const ip = (await headers()).get("cf-connecting-ip") ?? undefined;

  const human = await verifyTurnstile(parsed.data.turnstileToken, env.TURNSTILE_SECRET_KEY, ip);
  if (!human) {
    return { ok: false, error: "Human verification failed — please try once more." };
  }

  const d = parsed.data;
  const db = createDb(env.HYPERDRIVE.connectionString);
  try {
    await db.insert(schema.leads).values({
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
    });
    return { ok: true };
  } catch (err) {
    console.error("lead insert failed", err);
    return {
      ok: false,
      error: "Something went wrong on our side. Please try again, or call us directly.",
    };
  } finally {
    ctx.waitUntil(db.$client.end());
  }
}
