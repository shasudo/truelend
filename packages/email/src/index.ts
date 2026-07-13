/*
 * Transactional email via Resend's HTTP API — no SDK, just fetch (Workers-clean).
 * Env-gated: with no RESEND_API_KEY, sends are skipped (so dev/preview work
 * without keys, exactly like Turnstile). Call sites fire-and-forget through
 * ctx.waitUntil so email never blocks or breaks the user's action.
 */

export interface EmailEnv {
  RESEND_API_KEY?: string;
  /** e.g. "TrueLend <hello@truelend.in>" */
  EMAIL_FROM?: string;
  /** where internal alerts (new leads) are sent */
  TEAM_EMAIL?: string;
}

export interface SendEmailOptions {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

export type SendResult = { ok: true; skipped?: boolean } | { ok: false; error: string };

export async function sendEmail(
  apiKey: string | undefined,
  opts: SendEmailOptions,
): Promise<SendResult> {
  if (!apiKey) return { ok: true, skipped: true };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: opts.from,
        to: Array.isArray(opts.to) ? opts.to : [opts.to],
        subject: opts.subject,
        html: opts.html,
        reply_to: opts.replyTo,
      }),
    });
    if (!res.ok) return { ok: false, error: `Resend ${res.status}: ${await res.text()}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/* ---- branded HTML layout (inline styles — email clients need them) ---- */

const NAVY = "#14204a";
const RED = "#ce0e17";
const PAPER = "#faf8f3";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function emailLayout(bodyHtml: string): string {
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

export interface NewLeadInfo {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  product?: string | null;
  message?: string | null;
  /** e.g. "Website enquiry", "Business partner: Acme Distributors" */
  source: string;
}

/** Alerts the internal team that a new lead arrived. No-op without config. */
export function notifyNewLead(env: EmailEnv, lead: NewLeadInfo): Promise<SendResult> {
  if (!env.EMAIL_FROM || !env.TEAM_EMAIL) return Promise.resolve({ ok: true, skipped: true });
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
  return sendEmail(env.RESEND_API_KEY, {
    from: env.EMAIL_FROM,
    to: env.TEAM_EMAIL,
    replyTo: lead.email ?? undefined,
    subject: `New lead: ${lead.name ?? "Unknown"} · ${lead.source}`,
    html,
  });
}

export interface PartnerDecisionInfo {
  to: string;
  name: string;
  decision: "verified" | "rejected";
  reason?: string | null;
  loginUrl: string;
}

/** Emails a partner when their application is verified or rejected. */
export function notifyPartnerDecision(
  env: EmailEnv,
  info: PartnerDecisionInfo,
): Promise<SendResult> {
  if (!env.EMAIL_FROM) return Promise.resolve({ ok: true, skipped: true });
  const first = info.name.split(" ")[0] ?? info.name;
  const html =
    info.decision === "verified"
      ? emailLayout(
          heading("You're verified! 🎉") +
            para(`Hi ${esc(first)}, your TrueLend partner account has been verified.`) +
            para("You can now sign in, submit leads, and track them through to disbursal.") +
            `<div style="margin-top:8px;">${button(info.loginUrl, "Go to your dashboard")}</div>`,
        )
      : emailLayout(
          heading("Your application needs attention") +
            para(`Hi ${esc(first)}, we couldn't verify your partner application just yet.`) +
            (info.reason ? para(`<strong>Reason:</strong> ${esc(info.reason)}`) : "") +
            para("Please sign in, correct your details or documents, and resubmit.") +
            `<div style="margin-top:8px;">${button(info.loginUrl, "Update your application")}</div>`,
        );
  return sendEmail(env.RESEND_API_KEY, {
    from: env.EMAIL_FROM,
    to: info.to,
    subject:
      info.decision === "verified"
        ? "You're verified — welcome to TrueLend Partners"
        : "Action needed on your TrueLend partner application",
    html,
  });
}

export interface PasswordResetInfo {
  to: string;
  name: string;
  /** The reset link generated by better-auth (already contains the token). */
  url: string;
}

/** Emails a user a password-reset link. No-op without EMAIL_FROM configured. */
export function sendPasswordReset(env: EmailEnv, info: PasswordResetInfo): Promise<SendResult> {
  if (!env.EMAIL_FROM) return Promise.resolve({ ok: true, skipped: true });
  const first = info.name.split(" ")[0] ?? info.name;
  const html = emailLayout(
    heading("Reset your password") +
      para(`Hi ${esc(first)}, we received a request to reset your TrueLend password.`) +
      para(
        "Click below to choose a new one. This link expires in an hour. If you didn't request it, you can safely ignore this email.",
      ) +
      `<div style="margin-top:8px;">${button(info.url, "Reset password")}</div>`,
  );
  return sendEmail(env.RESEND_API_KEY, {
    from: env.EMAIL_FROM,
    to: info.to,
    subject: "Reset your TrueLend password",
    html,
  });
}
