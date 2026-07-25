/*
 * Transactional email via Resend's HTTP API — no SDK, just fetch (Workers-clean).
 * Env-gated: with no RESEND_API_KEY, sends are skipped so local development can
 * run without a provider. Callers choose whether delivery is background work or
 * a required part of the flow; password-reset callers fail closed in production.
 */

interface EmailEnv {
  RESEND_API_KEY?: string;
  /** e.g. "TrueLend <hello@truelend.in>" */
  EMAIL_FROM?: string;
  /** Dedicated sender for referral-partner decisions and communication. */
  PARTNER_EMAIL?: string;
  /** where internal alerts (new leads) are sent */
  TEAM_EMAIL?: string;
}

interface SendEmailOptions {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

type SendResult = { ok: true; skipped?: boolean } | { ok: false; error: string };
type EmailContext = "new_lead" | "partner_registration" | "partner_decision" | "password_reset";

// Callers fire-and-forget through ctx.waitUntil, so a failed SendResult is
// never read. Log at the send boundary so failures/skips still surface in
// Worker logs instead of vanishing.
// ponytail: delivery failures are log-only after one idempotent transient retry;
// add queueing and alerting before activation or decision email is approved for
// live operations.
function logSkip(context: string): SendResult {
  console.warn(JSON.stringify({ event: "email_skipped", context, reason: "not_configured" }));
  return { ok: true, skipped: true };
}

async function sendEmail(
  apiKey: string | undefined,
  context: EmailContext,
  opts: SendEmailOptions,
): Promise<SendResult> {
  if (!apiKey) return logSkip(`${context} (RESEND_API_KEY unset)`);
  // Resend retains an idempotency key for 24 hours. Reusing it on a retry prevents
  // an ambiguous network failure from creating duplicate messages.
  const idempotencyKey = crypto.randomUUID();
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          from: opts.from,
          to: Array.isArray(opts.to) ? opts.to : [opts.to],
          subject: opts.subject,
          html: opts.html,
          reply_to: opts.replyTo,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) return { ok: true };

      const retryable = res.status === 429 || res.status >= 500;
      if (retryable && attempt === 1) {
        console.warn(
          JSON.stringify({ event: "email_send_retrying", context, status: res.status, attempt }),
        );
        await new Promise((resolve) => setTimeout(resolve, 250));
        continue;
      }

      const error = `Email provider rejected the request (${res.status})`;
      console.error(
        JSON.stringify({ event: "email_send_failed", context, status: res.status, attempt }),
      );
      return { ok: false, error };
    } catch (cause) {
      if (attempt === 1) {
        console.warn(
          JSON.stringify({
            event: "email_send_retrying",
            context,
            errorType: cause instanceof Error ? cause.name : "unknown",
            attempt,
          }),
        );
        await new Promise((resolve) => setTimeout(resolve, 250));
        continue;
      }
      console.error(
        JSON.stringify({
          event: "email_send_error",
          context,
          errorType: cause instanceof Error ? cause.name : "unknown",
          attempt,
        }),
      );
      return { ok: false, error: "Email provider request failed" };
    }
  }
  return { ok: false, error: "Email provider request failed" };
}

/* ---- branded HTML layout (inline styles — email clients need them) ---- */

const NAVY = "#14204a";
const RED = "#ce0e17";
const PAPER = "#faf8f3";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function emailLayout(bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:${PAPER};font-family:Helvetica,Arial,sans-serif;color:#1c2a56;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <div style="padding:8px 0 20px 0;font-size:22px;font-weight:800;letter-spacing:-0.5px;color:${NAVY};">
      True<span style="font-weight:500;">Lend</span>
    </div>
    <div style="background:#ffffff;border:1px solid rgba(20,32,74,0.12);border-radius:14px;padding:28px;">
      ${bodyHtml}
    </div>
    <p style="margin:20px 4px 0 4px;font-size:12px;color:#6d7dac;">
      TrueLend · Lending Choices, Simplified.
    </p>
  </div></body></html>`;
}

function button(href: string, label: string): string {
  return `<a href="${esc(href)}" style="display:inline-block;background:${RED};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:9px;">${esc(label)}</a>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 12px 0;font-size:22px;font-weight:800;color:${NAVY};">${esc(text)}</h1>`;
}

function para(text: string): string {
  return `<p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#2d3d74;">${text}</p>`;
}

interface NewLeadInfo {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  product?: string | null;
  message?: string | null;
  /** e.g. "Website enquiry", "Referral Partner: Anil Kumar" */
  source: string;
}

/** Alerts the internal team that a new lead arrived. No-op without config. */
export function notifyNewLead(env: EmailEnv, lead: NewLeadInfo): Promise<SendResult> {
  if (!env.EMAIL_FROM || !env.TEAM_EMAIL)
    return Promise.resolve(logSkip("new-lead alert (EMAIL_FROM/TEAM_EMAIL unset)"));
  const rows = [
    ["Name", lead.name],
    ["Phone", lead.phone],
    ["Email", lead.email],
    ["City", lead.city],
    ["Product", lead.product],
    ["Source", lead.source],
    ["Message", lead.message],
  ]
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#6d7dac;font-size:13px;vertical-align:top;">${k}</td><td style="padding:6px 0;font-weight:600;color:${NAVY};font-size:14px;">${esc(String(v))}</td></tr>`,
    )
    .join("");
  const html = emailLayout(
    heading("New lead") +
      para("A new lead just came in. Details below.") +
      `<table style="width:100%;border-collapse:collapse;margin-top:4px;">${rows}</table>`,
  );
  return sendEmail(env.RESEND_API_KEY, "new_lead", {
    from: env.EMAIL_FROM,
    to: env.TEAM_EMAIL,
    replyTo: lead.email ?? undefined,
    subject: `New lead: ${lead.name ?? "Unknown"} · ${lead.source}`,
    html,
  });
}

interface PartnerRegistrationInfo {
  to: string;
  name: string;
  referenceId: string;
  dashboardUrl: string;
}

/** Confirms that a Referral Partner registration was received for review. */
export function notifyPartnerRegistration(
  env: EmailEnv,
  info: PartnerRegistrationInfo,
): Promise<SendResult> {
  const from = env.PARTNER_EMAIL ?? env.EMAIL_FROM;
  if (!from)
    return Promise.resolve(logSkip("partner-registration email (PARTNER_EMAIL/EMAIL_FROM unset)"));
  const first = info.name.split(" ")[0] ?? info.name;
  const html = emailLayout(
    heading("Your application has been submitted") +
      para(`Hi ${esc(first)}, thank you for joining the TrueLend Referral Network.`) +
      para(
        `Your Referral Partner reference ID is <strong>${esc(info.referenceId)}</strong>. Keep it for future support requests.`,
      ) +
      para(
        "Our team will review your application and contact you if any additional information is needed.",
      ) +
      `<div style="margin-top:8px;">${button(info.dashboardUrl, "View application status")}</div>`,
  );
  return sendEmail(env.RESEND_API_KEY, "partner_registration", {
    from,
    to: info.to,
    subject: "We received your TrueLend Referral Partner application",
    html,
  });
}

interface PartnerDecisionInfo {
  to: string;
  name: string;
  decision: "verified" | "rejected";
  reason?: string | null;
  loginUrl: string;
}

/** Emails a Referral Partner when their application is verified or rejected. */
export function notifyPartnerDecision(
  env: EmailEnv,
  info: PartnerDecisionInfo,
): Promise<SendResult> {
  const from = env.PARTNER_EMAIL ?? env.EMAIL_FROM;
  if (!from)
    return Promise.resolve(logSkip("partner-decision email (PARTNER_EMAIL/EMAIL_FROM unset)"));
  const first = info.name.split(" ")[0] ?? info.name;
  const html =
    info.decision === "verified"
      ? emailLayout(
          heading("You're verified! 🎉") +
            para(`Hi ${esc(first)}, your TrueLend Referral Partner account has been verified.`) +
            para("You can now sign in, submit leads, and track them through to disbursal.") +
            `<div style="margin-top:8px;">${button(info.loginUrl, "Go to your dashboard")}</div>`,
        )
      : emailLayout(
          heading("Your application needs attention") +
            para(
              `Hi ${esc(first)}, we couldn't verify your referral-partner application just yet.`,
            ) +
            (info.reason ? para(`<strong>Reason:</strong> ${esc(info.reason)}`) : "") +
            para("Please sign in, correct your details or documents, and resubmit.") +
            `<div style="margin-top:8px;">${button(info.loginUrl, "Update your application")}</div>`,
        );
  return sendEmail(env.RESEND_API_KEY, "partner_decision", {
    from,
    to: info.to,
    subject:
      info.decision === "verified"
        ? "You're verified — welcome to TrueLend Referral Partners"
        : "Action needed on your TrueLend Referral Partner application",
    html,
  });
}

interface PasswordResetInfo {
  to: string;
  name: string;
  /** The reset link generated by better-auth (already contains the token). */
  url: string;
}

/** Emails a user a password-reset link. No-op without EMAIL_FROM configured. */
export function sendPasswordReset(env: EmailEnv, info: PasswordResetInfo): Promise<SendResult> {
  if (!env.EMAIL_FROM) return Promise.resolve(logSkip("password-reset email (EMAIL_FROM unset)"));
  const first = info.name.split(" ")[0] ?? info.name;
  const html = emailLayout(
    heading("Reset your password") +
      para(`Hi ${esc(first)}, we received a request to reset your TrueLend password.`) +
      para(
        "Click below to choose a new one. This link expires in an hour. If you didn't request it, you can safely ignore this email.",
      ) +
      `<div style="margin-top:8px;">${button(info.url, "Reset password")}</div>`,
  );
  return sendEmail(env.RESEND_API_KEY, "password_reset", {
    from: env.EMAIL_FROM,
    to: info.to,
    subject: "Reset your TrueLend password",
    html,
  });
}
