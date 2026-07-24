"use server";

import { headers } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDb, schema } from "@truelend/db";
import { notifyNewLead } from "@truelend/email";
import {
  customerConsentVersion,
  leadKindLabels,
  productName,
  rupeesToPaise,
} from "@truelend/reference";
import type { TurnstileAction } from "@truelend/turnstile/actions";
import { verifyTurnstile } from "@truelend/turnstile/server";
import { leadSchema } from "./lead-schemas";

type SubmitResult = { ok: true } | { ok: false; error: string };
const TURNSTILE_ACTIONS: Record<string, TurnstileAction> = {
  enquiry: "lead_enquiry",
  referral: "lead_referral",
  contact: "lead_contact",
  cibil_notify: "lead_cibil_notify",
};

const blank = (v: string | undefined) => (v && v.length > 0 ? v : undefined);
const intOrNull = (v: string | undefined) => {
  if (!v) return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
};

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

  const human = await verifyTurnstile({
    token: parsed.data.turnstileToken,
    secret: env.TURNSTILE_SECRET_KEY,
    siteKeyConfigured: Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY),
    expectedAction: TURNSTILE_ACTIONS[parsed.data.kind]!,
    ip: ip === "anonymous" ? undefined : ip,
    expectedHostname: hostname,
    production: process.env.NODE_ENV === "production",
  });
  if (!human) {
    return { ok: false, error: "Human verification failed — please try once more." };
  }

  const d = parsed.data;
  const contactMessage =
    d.kind === "contact"
      ? [
          `Enquiry type: ${d.reason}`,
          d.subject ? `Subject: ${d.subject}` : undefined,
          "",
          d.message,
        ]
          .filter((part): part is string => part !== undefined)
          .join("\n")
      : "message" in d
        ? blank(d.message)
        : undefined;
  const db = createDb(env.HYPERDRIVE.connectionString);
  try {
    // Resolve an RP affiliate ref to the Referral Partner it credits. A rejected
    // Referral Partner earns nothing; an unknown code silently falls back to direct.
    const refCode = d.ref?.trim().toUpperCase();
    let partnerId: string | undefined;
    if (refCode) {
      const rows = (await db.$client`
        select user_id from partners
        where reference_id = ${refCode} and status <> 'rejected'
        limit 1
      `) as { user_id: string }[];
      partnerId = rows[0]?.user_id;
    }

    // Loan-application detail exists only on the enquiry/referral variants, and
    // the two forms capture different fields — hence the kind-narrowed blocks.
    const sharedLoan =
      d.kind === "enquiry" || d.kind === "referral"
        ? {
            loanAmountPaise: rupeesToPaise(d.loanAmount),
            tenureMonths: intOrNull(d.tenureMonths),
            loanPurpose: blank(d.loanPurpose),
            pincode: blank(d.pincode),
            employmentType: d.employmentType || undefined,
            monthlyIncomePaise: rupeesToPaise(d.monthlyIncome),
            employerName: blank(d.employerName),
            experienceYears: intOrNull(d.experienceYears),
            existingEmiPaise: rupeesToPaise(d.existingEmi),
          }
        : {};
    const enquiryLoan =
      d.kind === "enquiry"
        ? {
            preferredEmiPaise: rupeesToPaise(d.preferredEmi),
            outstandingLoanAmountPaise: rupeesToPaise(d.outstandingLoanAmount),
            creditCardOutstandingPaise: rupeesToPaise(d.creditCardOutstanding),
            existingWithEmployer: blank(d.existingWithEmployer),
          }
        : {};
    const referralLoan =
      d.kind === "referral"
        ? {
            residenceType: d.residenceType || undefined,
            assetValuePaise: rupeesToPaise(d.assetValue),
            annualTurnoverPaise: rupeesToPaise(d.annualTurnover),
          }
        : {};

    const consentAt = new Date();
    await db.transaction(async (tx) => {
      const [lead] = await tx
        .insert(schema.leads)
        .values({
          ...sharedLoan,
          ...enquiryLoan,
          ...referralLoan,
          kind: d.kind,
          name: "name" in d ? blank(d.name) : undefined,
          phone: "phone" in d ? blank(d.phone) : undefined,
          email: "email" in d ? blank(d.email) : undefined,
          city: "city" in d ? blank(d.city) : undefined,
          productSlug: "productSlug" in d ? blank(d.productSlug) : undefined,
          message: contactMessage,
          referrerName: "referrerName" in d ? blank(d.referrerName) : undefined,
          referrerPhone: "referrerPhone" in d ? blank(d.referrerPhone) : undefined,
          utmSource: blank(d.utmSource),
          utmMedium: blank(d.utmMedium),
          utmCampaign: blank(d.utmCampaign),
          utmLastSource: blank(d.utmLastSource),
          utmLastMedium: blank(d.utmLastMedium),
          utmLastCampaign: blank(d.utmLastCampaign),
          partnerId,
          consent: d.consent,
          consentAt,
          consentSource: "website_form",
          consentVersion: customerConsentVersion,
        })
        .returning({ id: schema.leads.id });
      await tx.insert(schema.auditLog).values({
        action: "lead.create",
        entityType: "lead",
        entityId: lead?.id,
        after: {
          source: partnerId ? "referral_partner_link" : "website_form",
          kind: d.kind,
          contactReason: d.kind === "contact" ? d.reason : undefined,
          partnerRef: partnerId ? refCode : undefined,
          consentVersion: customerConsentVersion,
        },
      });
    });
    ctx.waitUntil(
      notifyNewLead(env, {
        name: "name" in d ? d.name : undefined,
        phone: "phone" in d ? d.phone : undefined,
        email: "email" in d ? d.email : undefined,
        city: "city" in d ? d.city : undefined,
        product: "productSlug" in d && d.productSlug ? productName(d.productSlug) : undefined,
        message: contactMessage,
        source: partnerId ? `Referral Partner · ${refCode}` : `Website · ${leadKindLabels[d.kind]}`,
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
