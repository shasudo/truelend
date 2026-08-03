/*
 * Transactional email via Resend's HTTP API — no SDK, just fetch (Workers-clean).
 * Env-gated: with no RESEND_API_KEY, sends are skipped so local development can
 * run without a provider. Callers choose whether delivery is background work or
 * a required part of the flow; password-reset callers fail closed in production.
 *
 * Every message renders an HTML and a plain-text part. The text part is derived
 * from the HTML rather than authored twice, so the two cannot drift.
 */

interface EmailEnv {
  RESEND_API_KEY?: string;
  /** e.g. "TrueLend <hello@truelend.in>" */
  EMAIL_FROM?: string;
  /** Dedicated sender for referral-partner decisions and communication. */
  PARTNER_EMAIL?: string;
  /** where internal alerts (new leads, staff account changes) are sent */
  TEAM_EMAIL?: string;
}

interface SendEmailOptions {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  /**
   * Stable per-event key. Resend holds it for 24 hours, so a double-submitted
   * action collapses to a single delivery. Omit to force a fresh send, which is
   * what a deliberate manual retry wants.
   */
  idempotencyKey?: string;
}

export type SendResult =
  { ok: true; skipped?: boolean; id?: string } | { ok: false; error: string; status?: number };

export type EmailContext =
  | "new_lead"
  | "lead_received"
  | "lead_status"
  | "enquiry_form_link"
  | "partner_registration"
  | "partner_kyc_submitted"
  | "partner_decision"
  | "partner_payout"
  | "partner_lead_status"
  | "staff_account"
  | "password_reset";

// Background callers fire-and-forget through ctx.waitUntil, so their SendResult
// is never read. Log at the send boundary so failures/skips still surface in
// Worker logs instead of vanishing. Admin-triggered sends are awaited by their
// action and report failure to the operator directly.
// ponytail: background delivery failures are still log-only after one
// idempotent transient retry; add a queue and alerting if self-service volume
// grows enough that a lost lead acknowledgement matters.
function logSkip(context: string): SendResult {
  console.warn(JSON.stringify({ event: "email_skipped", context, reason: "not_configured" }));
  return { ok: true, skipped: true };
}

async function acceptedMessageId(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object" && "id" in body && typeof body.id === "string") {
      return body.id;
    }
  } catch {
    // An accepted send without a JSON body is still accepted.
  }
  return undefined;
}

async function sendEmail(
  apiKey: string | undefined,
  context: EmailContext,
  opts: SendEmailOptions,
): Promise<SendResult> {
  if (!apiKey) return logSkip(`${context} (RESEND_API_KEY unset)`);
  // Resend retains an idempotency key for 24 hours. A caller-supplied key makes
  // a repeated user action (double-clicked button, retried server action)
  // collapse to one message; the generated fallback only covers the retry below.
  const idempotencyKey = opts.idempotencyKey ?? crypto.randomUUID();
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
          text: opts.text,
          reply_to: opts.replyTo,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) {
        const id = await acceptedMessageId(res);
        return id ? { ok: true, id } : { ok: true };
      }

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
      return { ok: false, error, status: res.status };
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

/* ---- branded layout (inline styles — email clients need them) ---- */

const NAVY = "#14204a";
const RED = "#ce0e17";
const PAPER = "#faf8f3";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Reverses esc for the derived text part. "&amp;" is undone last so that an
// escaped entity in the source ("&amp;lt;") survives the round trip intact.
const unesc = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");

const textOf = (html: string) => unesc(html.replace(/<[^>]*>/g, "")).trim();

const firstName = (name?: string | null) => {
  const trimmed = (name ?? "").trim();
  return trimmed.length > 0 ? (trimmed.split(" ")[0] ?? trimmed) : "there";
};

/*
 * The subject is the one field carrying user input without escaping. The
 * request body is JSON, so header injection is not reachable, but keep it
 * single-line and bounded rather than relying on that indefinitely.
 */
const subjectOf = (value: string) => value.replace(/\s+/g, " ").trim().slice(0, 180);

/*
 * Every link is config- or better-auth-derived today. Reject anything that is
 * not http(s) loudly instead of rendering an unexpected scheme into a message
 * that cannot be recalled once delivered. Best-effort callers run inside a
 * background-task wrapper that catches and logs this; password reset fails
 * closed, which is the required behavior there.
 */
function safeHref(href: string): string {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    throw new TypeError("Email link must be an absolute URL");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new TypeError("Email link must use http(s)");
  }
  return url.toString();
}

interface Message {
  heading: string;
  /** Inline HTML is permitted; callers escape their own interpolations. */
  paragraphs: string[];
  rows?: (readonly [string, string])[];
  action?: { href: string; label: string };
}

function render(message: Message): { html: string; text: string } {
  const href = message.action ? safeHref(message.action.href) : undefined;
  const rows = message.rows ?? [];

  const rowsHtml =
    rows.length > 0
      ? `<table style="width:100%;border-collapse:collapse;margin-top:4px;">${rows
          .map(
            ([label, value]) =>
              `<tr><td style="padding:6px 12px 6px 0;color:#6d7dac;font-size:13px;vertical-align:top;">${esc(label)}</td><td style="padding:6px 0;font-weight:600;color:${NAVY};font-size:14px;">${esc(value)}</td></tr>`,
          )
          .join("")}</table>`
      : "";

  const actionHtml =
    href && message.action
      ? `<div style="margin-top:8px;"><a href="${esc(href)}" style="display:inline-block;background:${RED};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:9px;">${esc(message.action.label)}</a></div>`
      : "";

  const body =
    `<h1 style="margin:0 0 12px 0;font-size:22px;font-weight:800;color:${NAVY};">${esc(message.heading)}</h1>` +
    message.paragraphs
      .map(
        (paragraph) =>
          `<p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#2d3d74;">${paragraph}</p>`,
      )
      .join("") +
    rowsHtml +
    actionHtml;

  const html = `<!doctype html><html><body style="margin:0;padding:0;background:${PAPER};font-family:Helvetica,Arial,sans-serif;color:#1c2a56;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <div style="padding:8px 0 20px 0;font-size:22px;font-weight:800;letter-spacing:-0.5px;color:${NAVY};">
      True<span style="font-weight:500;">Lend</span>
    </div>
    <div style="background:#ffffff;border:1px solid rgba(20,32,74,0.12);border-radius:14px;padding:28px;">
      ${body}
    </div>
    <p style="margin:20px 4px 0 4px;font-size:12px;color:#6d7dac;">
      TrueLend · Lending Choices, Simplified.
    </p>
  </div></body></html>`;

  const lines = [message.heading, ""];
  for (const paragraph of message.paragraphs) lines.push(textOf(paragraph), "");
  for (const [label, value] of rows) lines.push(`${label}: ${value}`);
  if (rows.length > 0) lines.push("");
  if (href && message.action) lines.push(`${message.action.label}: ${href}`, "");
  lines.push("TrueLend · Lending Choices, Simplified.");

  return { html, text: lines.join("\n") };
}

interface Delivery {
  replyTo?: string;
  idempotencyKey?: string;
}

function send(
  env: EmailEnv,
  context: EmailContext,
  from: string,
  to: string | string[],
  subject: string,
  message: Message,
  delivery: Delivery = {},
): Promise<SendResult> {
  const { html, text } = render(message);
  return sendEmail(env.RESEND_API_KEY, context, {
    from,
    to,
    subject: subjectOf(subject),
    html,
    text,
    replyTo: delivery.replyTo,
    idempotencyKey: delivery.idempotencyKey,
  });
}

/** The referral-partner sender, falling back to the general one. */
const partnerSender = (env: EmailEnv) => env.PARTNER_EMAIL ?? env.EMAIL_FROM;

/* ---- internal alerts ---- */

interface NewLeadInfo {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  product?: string | null;
  message?: string | null;
  /** e.g. "Website enquiry", "Referral Partner: Anil Kumar" */
  source: string;
  idempotencyKey?: string;
}

/** Alerts the internal team that a new lead arrived. No-op without config. */
export function notifyNewLead(env: EmailEnv, lead: NewLeadInfo): Promise<SendResult> {
  if (!env.EMAIL_FROM || !env.TEAM_EMAIL)
    return Promise.resolve(logSkip("new-lead alert (EMAIL_FROM/TEAM_EMAIL unset)"));
  const rows: (readonly [string, string])[] = [];
  const addRow = (label: string, value: string | null | undefined) => {
    if (value) rows.push([label, value] as const);
  };
  addRow("Name", lead.name);
  addRow("Phone", lead.phone);
  addRow("Email", lead.email);
  addRow("City", lead.city);
  addRow("Product", lead.product);
  addRow("Source", lead.source);
  addRow("Message", lead.message);

  return send(
    env,
    "new_lead",
    env.EMAIL_FROM,
    env.TEAM_EMAIL,
    `New lead: ${lead.name ?? "Unknown"} · ${lead.source}`,
    {
      heading: "New lead",
      paragraphs: ["A new lead just came in. Details below."],
      rows,
    },
    { replyTo: lead.email ?? undefined, idempotencyKey: lead.idempotencyKey },
  );
}

interface StaffAccountInfo {
  event: "created" | "role_changed";
  staffEmail: string;
  staffName?: string | null;
  role: string;
  actorEmail?: string | null;
  idempotencyKey?: string;
}

/** Tells the team inbox that a staff account was created or re-roled. */
export function notifyStaffAccountEvent(
  env: EmailEnv,
  info: StaffAccountInfo,
): Promise<SendResult> {
  if (!env.EMAIL_FROM || !env.TEAM_EMAIL)
    return Promise.resolve(logSkip("staff-account alert (EMAIL_FROM/TEAM_EMAIL unset)"));
  const created = info.event === "created";
  const rows: (readonly [string, string])[] = [
    ["Account", info.staffEmail],
    ["Role", info.role],
  ];
  if (info.staffName) rows.push(["Name", info.staffName]);
  if (info.actorEmail) rows.push(["Changed by", info.actorEmail]);

  return send(
    env,
    "staff_account",
    env.EMAIL_FROM,
    env.TEAM_EMAIL,
    created
      ? `Staff account created: ${info.staffEmail}`
      : `Staff role changed: ${info.staffEmail}`,
    {
      heading: created ? "Staff account created" : "Staff role changed",
      paragraphs: [
        created
          ? "A new staff account now has access to the admin console."
          : "An existing staff account was given a different role.",
      ],
      rows,
    },
    { idempotencyKey: info.idempotencyKey },
  );
}

/* ---- applicant-facing ---- */

export type LeadKind = "enquiry" | "referral" | "contact" | "cibil_notify";

interface LeadReceivedInfo {
  to: string;
  name?: string | null;
  product?: string | null;
  /** Defaults to the loan-enquiry wording. */
  kind?: LeadKind;
  idempotencyKey?: string;
}

/*
 * Not every lead is a loan enquiry, and promising a callback to someone who
 * only asked to hear when CIBIL tracking launches is worse than staying quiet.
 */
const leadReceivedCopy: Readonly<
  Record<LeadKind, { subject: string; heading: string; closing: string }>
> = {
  enquiry: {
    subject: "We've received your TrueLend enquiry",
    heading: "We've got your enquiry",
    closing:
      "There's nothing you need to do right now. If you'd like to add anything, just reply to this email.",
  },
  referral: {
    subject: "We've received your TrueLend enquiry",
    heading: "We've got your enquiry",
    closing:
      "There's nothing you need to do right now. If you'd like to add anything, just reply to this email.",
  },
  contact: {
    subject: "We've received your message",
    heading: "Thanks for getting in touch",
    closing: "You can reply to this email if you'd like to add anything.",
  },
  cibil_notify: {
    subject: "You're on the TrueLend CIBIL notification list",
    heading: "You're on the list",
    closing: "Nothing else is needed from you. Reply to this email to be taken off the list.",
  },
};

/** Acknowledges a submitted lead to the person who submitted it. */
export function notifyLeadReceived(env: EmailEnv, info: LeadReceivedInfo): Promise<SendResult> {
  if (!env.EMAIL_FROM) return Promise.resolve(logSkip("lead-received email (EMAIL_FROM unset)"));
  const kind = info.kind ?? "enquiry";
  const copy = leadReceivedCopy[kind];
  const middle =
    kind === "cibil_notify"
      ? "We'll email you as soon as free CIBIL score tracking goes live."
      : kind === "contact"
        ? "We've received your message and someone from the team will get back to you shortly."
        : info.product
          ? `We've received your enquiry about <strong>${esc(info.product)}</strong>, and an advisor will call you shortly.`
          : "An advisor will review your details and call you shortly.";
  return send(
    env,
    "lead_received",
    env.EMAIL_FROM,
    info.to,
    copy.subject,
    {
      heading: copy.heading,
      paragraphs: [
        `Hi ${esc(firstName(info.name))}, thank you for reaching out to TrueLend.`,
        middle,
        copy.closing,
      ],
    },
    { idempotencyKey: info.idempotencyKey },
  );
}

interface EnquiryFormLinkInfo {
  to: string;
  name?: string | null;
  /** The public enquiry form, optionally carrying a ?product= preselection. */
  url: string;
  idempotencyKey?: string;
}

/*
 * Sends a prospect the public enquiry form after a call. There is no token and
 * no prefill beyond the ?product= query the form already reads — the link is
 * the same one anybody can reach, so it carries nothing worth intercepting.
 */
export function sendEnquiryFormLink(env: EmailEnv, info: EnquiryFormLinkInfo): Promise<SendResult> {
  if (!env.EMAIL_FROM) return Promise.resolve(logSkip("enquiry form link (EMAIL_FROM unset)"));
  return send(
    env,
    "enquiry_form_link",
    env.EMAIL_FROM,
    info.to,
    "Your TrueLend loan enquiry form",
    {
      heading: "Here's your enquiry form",
      paragraphs: [
        `Hi ${esc(firstName(info.name))}, thanks for speaking with us just now.`,
        "Fill in this short form and a Borrowing Advisor will pick it up from there. It takes about two minutes.",
        "If anything looks wrong or you'd rather we filled it in for you, just reply to this email.",
      ],
      action: { href: info.url, label: "Open the enquiry form" },
    },
    { idempotencyKey: info.idempotencyKey },
  );
}

export type CustomerLeadStatus = "contacted" | "approved" | "declined" | "disbursed";

/**
 * Pipeline stages worth telling the applicant about. The internal stages
 * (qualified, docs_collected, logged_in, lost) stay internal — an applicant
 * should not receive mail every time staff move a card.
 */
export const customerNotifiableLeadStatuses = [
  "contacted",
  "approved",
  "declined",
  "disbursed",
] as const satisfies readonly CustomerLeadStatus[];

export function isCustomerNotifiableLeadStatus(status: string): status is CustomerLeadStatus {
  return (customerNotifiableLeadStatuses as readonly string[]).includes(status);
}

const customerLeadStatusCopy: Readonly<
  Record<CustomerLeadStatus, { subject: string; heading: string; body: string }>
> = {
  contacted: {
    subject: "Your TrueLend application is being reviewed",
    heading: "We're on it",
    body: "An advisor has picked up your application and will be in touch to confirm your details.",
  },
  approved: {
    subject: "Good news about your TrueLend application",
    heading: "Your application is approved",
    body: "The lender has approved your loan application. We'll walk you through the remaining steps and disbursal.",
  },
  disbursed: {
    subject: "Your TrueLend loan has been disbursed",
    heading: "Your loan is disbursed",
    body: "The lender has disbursed your loan. Thank you for choosing TrueLend.",
  },
  declined: {
    subject: "An update on your TrueLend application",
    heading: "An update on your application",
    body: "The lender was not able to approve this application. That isn't the end of the road — your advisor can talk you through the options that may suit you better.",
  },
};

interface LeadStatusInfo {
  to: string;
  name?: string | null;
  status: CustomerLeadStatus;
  idempotencyKey?: string;
}

/** Tells the applicant their application moved to a stage they care about. */
export function notifyLeadStatusChanged(env: EmailEnv, info: LeadStatusInfo): Promise<SendResult> {
  if (!env.EMAIL_FROM) return Promise.resolve(logSkip("lead-status email (EMAIL_FROM unset)"));
  const copy = customerLeadStatusCopy[info.status];
  return send(
    env,
    "lead_status",
    env.EMAIL_FROM,
    info.to,
    copy.subject,
    {
      heading: copy.heading,
      paragraphs: [
        `Hi ${esc(firstName(info.name))},`,
        copy.body,
        "Reply to this email with any questions.",
      ],
    },
    { idempotencyKey: info.idempotencyKey },
  );
}

/* ---- referral-partner facing ---- */

interface PartnerRegistrationInfo {
  to: string;
  name: string;
  referenceId: string;
  dashboardUrl: string;
  idempotencyKey?: string;
}

/** Confirms account creation and directs the Referral Partner to complete KYC. */
export function notifyPartnerRegistration(
  env: EmailEnv,
  info: PartnerRegistrationInfo,
): Promise<SendResult> {
  const from = partnerSender(env);
  if (!from)
    return Promise.resolve(logSkip("partner-registration email (PARTNER_EMAIL/EMAIL_FROM unset)"));
  return send(
    env,
    "partner_registration",
    from,
    info.to,
    "Complete your TrueLend Referral Partner application",
    {
      heading: "Your Referral Partner account is ready",
      paragraphs: [
        `Hi ${esc(firstName(info.name))}, thank you for joining the TrueLend Referral Network.`,
        `Your Referral Partner reference ID is <strong>${esc(info.referenceId)}</strong>. Keep it for future support requests.`,
        "Sign in to add the remaining details and documents, then submit your application for review.",
      ],
      action: { href: info.dashboardUrl, label: "Complete your application" },
    },
    { idempotencyKey: info.idempotencyKey },
  );
}

interface PartnerKycSubmittedInfo {
  to: string;
  name: string;
  dashboardUrl: string;
  idempotencyKey?: string;
}

/** Confirms that a Referral Partner's application is now queued for review. */
export function notifyPartnerKycSubmitted(
  env: EmailEnv,
  info: PartnerKycSubmittedInfo,
): Promise<SendResult> {
  const from = partnerSender(env);
  if (!from)
    return Promise.resolve(logSkip("partner-kyc-submitted email (PARTNER_EMAIL/EMAIL_FROM unset)"));
  return send(
    env,
    "partner_kyc_submitted",
    from,
    info.to,
    "We've received your TrueLend Referral Partner application",
    {
      heading: "Application received",
      paragraphs: [
        `Hi ${esc(firstName(info.name))}, your Referral Partner application and documents are in.`,
        "Our team reviews applications within two working days, and we'll email you as soon as there's a decision.",
        "Your details stay locked while the application is under review.",
      ],
      action: { href: info.dashboardUrl, label: "View your application" },
    },
    { idempotencyKey: info.idempotencyKey },
  );
}

export type PartnerDecision = "verified" | "rejected" | "revoked";

interface PartnerDecisionInfo {
  to: string;
  name: string;
  decision: PartnerDecision;
  reason?: string | null;
  loginUrl: string;
  idempotencyKey?: string;
}

const partnerDecisionCopy: Readonly<
  Record<PartnerDecision, { subject: string; heading: string; body: string; action: string }>
> = {
  verified: {
    subject: "You're verified — welcome to TrueLend Referral Partners",
    heading: "You're verified! 🎉",
    body: "your TrueLend Referral Partner account has been verified. You can now sign in, submit leads, and track them through to disbursal.",
    action: "Go to your dashboard",
  },
  rejected: {
    subject: "Action needed on your TrueLend Referral Partner application",
    heading: "Your application needs attention",
    body: "we couldn't verify your referral-partner application just yet. Please sign in, correct your details or documents, and resubmit.",
    action: "Update your application",
  },
  revoked: {
    subject: "Your TrueLend Referral Partner verification has been paused",
    heading: "Your verification has been paused",
    body: "your Referral Partner verification has been paused and your application is back under review. Existing leads you've submitted are unaffected.",
    action: "View your application",
  },
};

/** Emails a Referral Partner when their application is verified, rejected, or revoked. */
export function notifyPartnerDecision(
  env: EmailEnv,
  info: PartnerDecisionInfo,
): Promise<SendResult> {
  const from = partnerSender(env);
  if (!from)
    return Promise.resolve(logSkip("partner-decision email (PARTNER_EMAIL/EMAIL_FROM unset)"));
  const copy = partnerDecisionCopy[info.decision];
  const paragraphs = [`Hi ${esc(firstName(info.name))}, ${copy.body}`];
  if (info.reason) paragraphs.push(`<strong>Reason:</strong> ${esc(info.reason)}`);
  return send(
    env,
    "partner_decision",
    from,
    info.to,
    copy.subject,
    {
      heading: copy.heading,
      paragraphs,
      action: { href: info.loginUrl, label: copy.action },
    },
    { idempotencyKey: info.idempotencyKey },
  );
}

interface PartnerPayoutInfo {
  to: string;
  name: string;
  /** "earned" is a commission accrual; "paid" is money actually sent. */
  kind: "earned" | "paid";
  /** Already formatted for display, e.g. "₹12,500.00". */
  amount: string;
  note?: string | null;
  dashboardUrl: string;
  idempotencyKey?: string;
}

/** Tells a Referral Partner that a ledger entry was recorded against them. */
export function notifyPartnerPayout(env: EmailEnv, info: PartnerPayoutInfo): Promise<SendResult> {
  const from = partnerSender(env);
  if (!from)
    return Promise.resolve(logSkip("partner-payout email (PARTNER_EMAIL/EMAIL_FROM unset)"));
  const paid = info.kind === "paid";
  const rows: (readonly [string, string])[] = [["Amount", info.amount]];
  if (info.note) rows.push(["Note", info.note]);
  return send(
    env,
    "partner_payout",
    from,
    info.to,
    paid ? `Payment sent: ${info.amount}` : `Commission recorded: ${info.amount}`,
    {
      heading: paid ? "A payment is on its way" : "Commission recorded",
      paragraphs: [
        paid
          ? `Hi ${esc(firstName(info.name))}, we've recorded a payment to you on your Referral Partner ledger.`
          : `Hi ${esc(firstName(info.name))}, we've credited commission to your Referral Partner ledger.`,
        "Your dashboard shows the full ledger and running balance.",
      ],
      rows,
      action: { href: info.dashboardUrl, label: "View your ledger" },
    },
    { idempotencyKey: info.idempotencyKey },
  );
}

export type PartnerLeadStatus =
  "new" | "contacted" | "logged_in" | "approved" | "declined" | "disbursed";

/**
 * Pipeline stages worth telling the referring partner about. Partners track
 * their own funnel, so they see one stage more than the applicant does.
 *
 * "new" is deliberately absent: arrival is announced once, by the capture side
 * that knows a lead is genuinely new. Listing it here would also re-notify on
 * any admin edit that parks a lead back at "new".
 */
export const partnerNotifiableLeadStatuses = [
  "contacted",
  "logged_in",
  "approved",
  "declined",
  "disbursed",
] as const satisfies readonly PartnerLeadStatus[];

export function isPartnerNotifiableLeadStatus(status: string): status is PartnerLeadStatus {
  return (partnerNotifiableLeadStatuses as readonly string[]).includes(status);
}

const partnerLeadStatusCopy: Readonly<Record<PartnerLeadStatus, string>> = {
  new: "has reached us through your referral link",
  contacted: "has been picked up by an advisor",
  logged_in: "has been logged in with a lender",
  approved: "has been approved by the lender",
  declined: "was not approved by the lender",
  disbursed: "has been disbursed",
};

interface PartnerLeadStatusInfo {
  to: string;
  name: string;
  leadName: string;
  status: PartnerLeadStatus;
  dashboardUrl: string;
  idempotencyKey?: string;
}

/** Tells a Referral Partner that a lead they sourced arrived or moved stage. */
export function notifyPartnerLeadStatusChanged(
  env: EmailEnv,
  info: PartnerLeadStatusInfo,
): Promise<SendResult> {
  const from = partnerSender(env);
  if (!from)
    return Promise.resolve(logSkip("partner-lead-status email (PARTNER_EMAIL/EMAIL_FROM unset)"));
  const arrived = info.status === "new";
  return send(
    env,
    "partner_lead_status",
    from,
    info.to,
    arrived
      ? `New referral received: ${info.leadName}`
      : `Update on your referral: ${info.leadName}`,
    {
      heading: arrived ? "A new lead came in through your link" : "Your referral moved forward",
      paragraphs: [
        `Hi ${esc(firstName(info.name))}, your referral <strong>${esc(info.leadName)}</strong> ${partnerLeadStatusCopy[info.status]}.`,
        "Your dashboard has the current stage for every lead you've submitted.",
      ],
      action: { href: info.dashboardUrl, label: "Open your dashboard" },
    },
    { idempotencyKey: info.idempotencyKey },
  );
}

/* ---- account ---- */

interface PasswordResetInfo {
  to: string;
  name: string;
  /** The reset link generated by better-auth (already contains the token). */
  url: string;
}

/** Emails a user a password-reset link. No-op without EMAIL_FROM configured. */
export function sendPasswordReset(env: EmailEnv, info: PasswordResetInfo): Promise<SendResult> {
  if (!env.EMAIL_FROM) return Promise.resolve(logSkip("password-reset email (EMAIL_FROM unset)"));
  // Deliberately not idempotency-keyed: every reset request mints a new token,
  // and collapsing two requests would strand the user with a dead link.
  return send(env, "password_reset", env.EMAIL_FROM, info.to, "Reset your TrueLend password", {
    heading: "Reset your password",
    paragraphs: [
      `Hi ${esc(firstName(info.name))}, we received a request to reset your TrueLend password.`,
      "Click below to choose a new one. This link expires in an hour. If you didn't request it, you can safely ignore this email.",
    ],
    action: { href: info.url, label: "Reset password" },
  });
}
