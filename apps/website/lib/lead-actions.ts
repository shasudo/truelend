"use server";

import { cookies, headers } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDb, schema } from "@truelend/db";
import { notifyLeadReceived, notifyNewLead, notifyPartnerLeadStatusChanged } from "@truelend/email";
import {
  appUrls,
  customerConsentVersion,
  itrFiledToBoolean,
  leadKindLabels,
  productName,
  rupeesToPaise,
} from "@truelend/reference";
import type { TurnstileAction } from "@truelend/turnstile/actions";
import { verifyTurnstile } from "@truelend/turnstile/server";
import { REF_COOKIE, sanitizeRef } from "./attribution";
import { scheduleWebsiteBackgroundTask } from "./background-task";
import { leadSchema } from "./lead-schemas";
import { resolvePartnerByRef } from "./partner-lookup";

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

  let submissionMayHaveBeenStored = false;
  try {
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
      // Referral Partner earns nothing; an unknown code falls back to direct.
      // Both sources are re-sanitized here — this is a public action, so the
      // format is enforced at the boundary rather than trusted from the browser.
      // The cookie is read first: middleware banks it on every ?ref= hit, while
      // the client store only updates on pages that render a form, so the cookie
      // is never the staler of the two. It is also the only signal that survives
      // an in-app browser with storage blocked.
      const refCode = sanitizeRef((await cookies()).get(REF_COOKIE)?.value) ?? sanitizeRef(d.ref);
      const { partner, refLookupFailed } = await resolvePartnerByRef(db, refCode, "lead");
      if (refCode && !partner && !refLookupFailed) {
        // A code that really matches no live partner, as opposed to an outage.
        // The audit row below records this too, but nothing reads audit_log —
        // this line is what actually surfaces a dead referral link in logs.
        console.error(
          JSON.stringify({ event: "lead_partner_ref_unresolved", ref: refCode, kind: d.kind }),
        );
      }
      const partnerId = partner?.userId;

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
              itrFiled: itrFiledToBoolean(d.itrFiled),
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
      submissionMayHaveBeenStored = true;
      // Hoisted out of the transaction: the notification keys below derive from
      // it so a retried submission cannot produce a second copy of either email.
      let leadId: string | undefined;
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
        leadId = lead?.id;
        await tx.insert(schema.auditLog).values({
          action: "lead.create",
          entityType: "lead",
          entityId: lead?.id,
          after: {
            source: partnerId
              ? "referral_partner_link"
              : refCode
                ? "unresolved_referral_partner_link"
                : "website_form",
            kind: d.kind,
            contactReason: d.kind === "contact" ? d.reason : undefined,
            partnerRef: refCode,
            partnerResolved: refCode ? Boolean(partnerId) : undefined,
            // Distinguishes "this code matches no partner" from "the lookup was
            // down" — otherwise an outage reads back as a batch of dead links.
            partnerLookupFailed: refLookupFailed || undefined,
            consentVersion: customerConsentVersion,
          },
        });
      });
      const product = "productSlug" in d && d.productSlug ? productName(d.productSlug) : undefined;
      scheduleWebsiteBackgroundTask(ctx, "website_lead_notification_failed", () =>
        notifyNewLead(env, {
          name: "name" in d ? d.name : undefined,
          phone: "phone" in d ? d.phone : undefined,
          email: "email" in d ? d.email : undefined,
          city: "city" in d ? d.city : undefined,
          product,
          message: contactMessage,
          source: partnerId
            ? `Referral Partner · ${refCode}`
            : refCode
              ? `Website · ${leadKindLabels[d.kind]} · unresolved ref ${refCode}`
              : `Website · ${leadKindLabels[d.kind]}`,
          idempotencyKey: leadId ? `new_lead:${leadId}` : undefined,
        }),
      );
      // Tell the Referral Partner their link produced a lead. Without this the
      // only party who would notice a broken link gets no signal until a much
      // later stage change — which is how the attribution bugs went unreported.
      // Only for the kinds a referral link is actually for: the ref survives 30
      // days across every form, and naming a contact-form sender or a CIBIL
      // signup as "your referral" would hand a partner a stranger's details.
      const isReferrableLead = d.kind === "enquiry" || d.kind === "referral";
      if (partner?.email && isReferrableLead) {
        const to = partner.email;
        const partnerName = partner.name ?? "there";
        scheduleWebsiteBackgroundTask(ctx, "website_partner_lead_notification_failed", () =>
          notifyPartnerLeadStatusChanged(env, {
            to,
            name: partnerName,
            leadName: ("name" in d && d.name) || "your referral",
            status: "new",
            dashboardUrl: `${appUrls.partners}/dashboard`,
            idempotencyKey: leadId ? `partner_lead_status:${leadId}:new` : undefined,
          }),
        );
      }
      // Acknowledge to the applicant. Email is optional on every lead form, so
      // this stays best-effort and silent when we have no address.
      const applicantEmail = "email" in d ? blank(d.email) : undefined;
      if (applicantEmail) {
        scheduleWebsiteBackgroundTask(ctx, "website_lead_acknowledgement_failed", () =>
          notifyLeadReceived(env, {
            to: applicantEmail,
            name: "name" in d ? d.name : undefined,
            product,
            kind: d.kind,
            idempotencyKey: leadId ? `lead_received:${leadId}` : undefined,
          }),
        );
      }
      return { ok: true };
    } catch (error) {
      console.error(
        JSON.stringify({
          event: "lead_insert_failed",
          kind: d.kind,
          errorType: error instanceof Error ? error.name : "unknown",
        }),
      );
      return {
        ok: false,
        // Same distinction the outer catch makes: only warn about a possible
        // duplicate when the insert was actually attempted. Anything that throws
        // before that point leaves nothing stored, and a safe retry is the advice.
        error: submissionMayHaveBeenStored
          ? "We couldn't confirm the submission. Please contact us before retrying if you may have already sent it."
          : "Something went wrong on our side. Please try again, or call us directly.",
      };
    } finally {
      scheduleWebsiteBackgroundTask(ctx, "website_lead_context_cleanup_failed", () =>
        db.$client.end(),
      );
    }
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "lead_submission_dependency_failed",
        kind: parsed.data.kind,
        errorType: error instanceof Error ? error.name : "unknown",
      }),
    );
    return {
      ok: false,
      error: submissionMayHaveBeenStored
        ? "We couldn't confirm the submission. Please contact us before retrying if you may have already sent it."
        : "Something went wrong on our side. Please try again, or call us directly.",
    };
  }
}
