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
const GREEN = "#0f7a3d";
const MUTED = "#6d7dac";

/** A small-caps label with a hairline beside it, for separating sections. */
const sectionRule = (caption: string) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:2px 0 18px 0;"><tr>` +
  `<td style="white-space:nowrap;padding-right:10px;font-size:10px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:${MUTED};font-family:Helvetica,Arial,sans-serif;">${caption.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</td>` +
  `<td width="100%" bgcolor="#e2e6f2" style="background:#e2e6f2;font-size:0;line-height:0;height:1px;">&nbsp;</td>` +
  `</tr></table>`;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const namedEntities: Readonly<Record<string, string>> = {
  "&nbsp;": " ",
  "&middot;": "·",
  "&zwnj;": "",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
};

/*
 * Reverses esc for the derived text part, and decodes the numeric entities the
 * layout uses for icons and ticks — without this a plain-text reader gets a
 * literal "&#10003;" where the HTML reader sees a checkmark. "&amp;" is undone
 * last so an escaped entity in the source ("&amp;lt;") survives the round trip
 * intact; the numeric pass runs first for the same reason and cannot match
 * inside an already-escaped "&amp;#10003;".
 */
const unesc = (s: string) =>
  s
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&nbsp;|&middot;|&zwnj;|&lt;|&gt;|&quot;/g, (match) => namedEntities[match] ?? match)
    .replace(/&amp;/g, "&");

/*
 * Block boundaries become newlines before the tags are stripped. Otherwise a
 * bulleted checklist inside a step collapses into one unreadable run-on line —
 * the markup carried the only separation there was.
 */
const textOf = (html: string) =>
  unesc(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/?(?:p|div|tr|table|li|h[1-6])(?:\s[^>]*)?>/gi, "\n")
      .replace(/<[^>]*>/g, ""),
  )
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

/** Keeps a wrapped step body aligned under its number instead of only the first line. */
const indent = (value: string) =>
  value
    .split("\n")
    .map((line) => `   ${line}`.trimEnd())
    .join("\n");

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

interface MessageStep {
  /** Inline HTML is permitted; callers escape their own interpolations. */
  title: string;
  body: string;
  /**
   * An emoji shown beside the title. Emoji is the only icon format that
   * survives every client: Gmail and Outlook block remote AND data-URI images
   * until the reader opts in, and neither renders inline SVG at all — so an
   * icon set of either kind would be invisible exactly when first impressions
   * are made. A font glyph always draws.
   */
  icon?: string;
  /** Renders a tick instead of a number — for a step already behind them. */
  done?: boolean;
}

interface Message {
  /** Small caps label above the heading, e.g. "Welcome". */
  eyebrow?: string;
  heading: string;
  /** Inline HTML is permitted; callers escape their own interpolations. */
  paragraphs: string[];
  /**
   * A boxed callout under the paragraphs, for the one fact worth keeping.
   *
   * `variant: "value"` (the default) is the navy card: big, letter-spaced,
   * monospace — right for a reference ID, an amount or a duration, and wrong
   * for anything long enough to wrap. `"note"` is a tinted callout at reading
   * size, for prose such as an admin's rejection reason.
   */
  highlight?: {
    label: string;
    value: string;
    caption?: string;
    variant?: "value" | "note";
    tone?: "good" | "bad";
  };
  /** A numbered walkthrough. Rendered between the paragraphs and the rows. */
  steps?: { caption?: string; items: MessageStep[] };
  /**
   * Where this message sits in a pipeline. `current` is a zero-based index into
   * `stages`; everything up to it reads as reached. `tone: "bad"` marks the
   * current stage as a stop rather than a milestone, so a decline is not
   * coloured like an approval.
   */
  progress?: { caption?: string; stages: string[]; current: number; tone?: "good" | "bad" };
  rows?: (readonly [string, string])[];
  action?: { href: string; label: string };
  /** Small print under the button, e.g. what to do if the button fails. */
  footnote?: string;
  /**
   * The grey line an inbox shows next to the subject. Without one, clients
   * scrape the opening body text, which on a branded layout means the reader's
   * preview is whatever the header happened to contain.
   */
  preheader?: string;
  /**
   * Top-right label in the header band, naming which side of the product this
   * came from. Omitted on messages that are not audience-specific — this shell
   * renders customer, staff and partner mail alike.
   */
  brandTag?: string;
  /** The "you are receiving this because…" line. Omitted when there is nothing honest to say. */
  reason?: string;
}

function render(message: Message): { html: string; text: string } {
  const href = message.action ? safeHref(message.action.href) : undefined;
  const rows = message.rows ?? [];
  const steps = message.steps;

  /*
   * A membership card rather than a tinted box: this is the one value the
   * reader is asked to keep, and on a phone it is what they screenshot. Navy
   * fill so it survives a dark-mode client's inversion looking deliberate.
   */
  const highlightHtml = message.highlight
    ? ((h) => {
        const open = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;margin:4px 0 26px 0;"><tr>`;
        if (h.variant === "note") {
          const accent = h.tone === "bad" ? RED : NAVY;
          return (
            open +
            `<td bgcolor="${PAPER}" style="background:${PAPER};border-left:3px solid ${accent};border-radius:8px;padding:14px 16px;">` +
            `<div style="font-size:10px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:${accent};">${esc(h.label)}</div>` +
            `<div style="margin-top:6px;font-size:14px;line-height:1.6;color:${NAVY};">${esc(h.value)}</div>` +
            (h.caption
              ? `<div style="margin-top:8px;font-size:12px;line-height:1.5;color:${MUTED};">${esc(h.caption)}</div>`
              : "") +
            `</td></tr></table>`
          );
        }
        return (
          open +
          `<td bgcolor="${NAVY}" style="background:${NAVY};border-radius:12px;padding:18px 20px;">` +
          `<div style="font-size:10px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#8fa0d4;">${esc(h.label)}</div>` +
          `<div style="margin-top:6px;font-size:24px;font-weight:800;letter-spacing:2px;color:#ffffff;font-family:'SF Mono',Consolas,Menlo,monospace;">${esc(h.value)}</div>` +
          (h.caption
            ? `<div style="margin-top:8px;font-size:12px;line-height:1.5;color:#8fa0d4;">${esc(h.caption)}</div>`
            : "") +
          `</td></tr></table>`
        );
      })(message.highlight)
    : "";

  /*
   * One table per step rather than one table with many rows: Outlook's renderer
   * is far more reliable about a two-cell table than about vertical alignment
   * across a long one, and a step is a self-contained unit anyway. Flex and grid
   * are unavailable here, so the numbered badge is a fixed-width cell.
   */
  const stepsHtml = steps
    ? (steps.caption ? sectionRule(steps.caption) : "") +
      steps.items
        .map((step, index) => {
          const last = index === steps.items.length - 1;
          const badgeFill = step.done ? GREEN : NAVY;
          const mark = step.done ? "&#10003;" : String(index + 1);
          /*
           * The rail is a 2px-wide cell rather than a border, because Outlook
           * drops borders on empty cells but honours a background colour on one
           * with a spacer in it. It stops at the last step so the timeline reads
           * as finished rather than trailing off.
           */
          const rail = last
            ? ""
            : `<tr><td style="padding:0;"><table role="presentation" width="28" cellpadding="0" cellspacing="0" border="0"><tr>` +
              `<td width="13" style="font-size:0;line-height:0;">&nbsp;</td>` +
              `<td width="2" bgcolor="#e2e6f2" style="background:#e2e6f2;font-size:0;line-height:0;height:14px;">&nbsp;</td>` +
              `<td width="13" style="font-size:0;line-height:0;">&nbsp;</td>` +
              `</tr></table></td><td style="padding:0;">&nbsp;</td></tr>`;
          return (
            `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr>` +
            `<td width="28" style="width:28px;padding:0 14px 0 0;vertical-align:top;">` +
            `<table role="presentation" width="28" height="28" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr>` +
            `<td align="center" bgcolor="${badgeFill}" style="background:${badgeFill};border-radius:14px;height:28px;width:28px;color:#ffffff;font-size:13px;font-weight:700;font-family:Helvetica,Arial,sans-serif;text-align:center;">${mark}</td>` +
            `</tr></table></td>` +
            `<td style="padding:0 0 2px 0;vertical-align:top;">` +
            `<div style="font-size:15px;font-weight:700;color:${NAVY};line-height:1.45;padding-top:4px;">` +
            (step.icon ? `<span style="font-size:16px;">${step.icon}</span>&nbsp;` : "") +
            `${step.title}</div>` +
            `<div style="margin-top:5px;font-size:14px;line-height:1.65;color:#4a5a8a;">${step.body}</div>` +
            `</td></tr>${rail}</table>`
          );
        })
        .join("")
    : "";

  /*
   * Equal-width stage cells, each a coloured bar over its label. The bar is a
   * one-cell table with height and bgcolor rather than a styled div, because a
   * div with only a height and no content collapses in Outlook.
   */
  const progressHtml = message.progress
    ? ((p) => {
        const reached = p.tone === "bad" ? RED : GREEN;
        const width = Math.floor(100 / p.stages.length);
        return (
          (p.caption ? sectionRule(p.caption) : "") +
          `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:0 0 24px 0;"><tr>` +
          p.stages
            .map((stage, index) => {
              const done = index <= p.current;
              const here = index === p.current;
              const fill = done ? reached : "#e2e6f2";
              return (
                `<td width="${width}%" valign="top" style="width:${width}%;padding:0 4px 0 0;">` +
                `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>` +
                `<td height="5" bgcolor="${fill}" style="background:${fill};height:5px;font-size:0;line-height:0;border-radius:3px;">&nbsp;</td>` +
                `</tr></table>` +
                `<div style="margin-top:8px;font-size:11px;line-height:1.35;font-weight:${here ? 700 : 600};color:${here ? NAVY : done ? "#4a5a8a" : "#9aa5c4"};">${esc(stage)}</div>` +
                (here
                  ? `<div style="margin-top:3px;font-size:10px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:${reached};">You are here</div>`
                  : "") +
                `</td>`
              );
            })
            .join("") +
          `</tr></table>`
        );
      })(message.progress)
    : "";

  const rowsHtml =
    rows.length > 0
      ? `<table style="width:100%;border-collapse:collapse;margin-top:4px;">${rows
          .map(
            ([label, value]) =>
              `<tr><td style="padding:6px 12px 6px 0;color:#6d7dac;font-size:13px;vertical-align:top;">${esc(label)}</td><td style="padding:6px 0;font-weight:600;color:${NAVY};font-size:14px;">${esc(value)}</td></tr>`,
          )
          .join("")}</table>`
      : "";

  /*
   * A table button, not a padded anchor. Outlook's Word engine ignores padding
   * on an inline element, which collapses the call to action into bare
   * underlined text — the one element in the message that must never degrade.
   */
  const actionHtml =
    href && message.action
      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;margin:26px 0 0 0;"><tr>` +
        `<td align="center" bgcolor="${RED}" style="background:${RED};border-radius:10px;">` +
        `<a href="${esc(href)}" style="display:inline-block;padding:14px 30px;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${esc(message.action.label)} &nbsp;&#8594;</a>` +
        `</td></tr></table>`
      : "";

  const footnoteHtml = message.footnote
    ? `<p style="margin:18px 0 0 0;font-size:12px;line-height:1.65;color:${MUTED};">${message.footnote}</p>`
    : "";

  const eyebrowHtml = message.eyebrow
    ? `<div style="margin:0 0 8px 0;font-size:10px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:${RED};">${esc(message.eyebrow)}</div>`
    : "";

  const body =
    eyebrowHtml +
    `<h1 style="margin:0 0 14px 0;font-size:25px;line-height:1.25;font-weight:800;letter-spacing:-0.4px;color:${NAVY};">${esc(message.heading)}</h1>` +
    message.paragraphs
      .map(
        (paragraph) =>
          `<p style="margin:0 0 14px 0;font-size:15px;line-height:1.65;color:#2d3d74;">${paragraph}</p>`,
      )
      .join("") +
    highlightHtml +
    progressHtml +
    stepsHtml +
    rowsHtml +
    actionHtml +
    footnoteHtml;

  /*
   * Hidden from the body, read by the inbox list as the grey line beside the
   * subject. The trailing filler stops Gmail from topping it up with whatever
   * markup follows.
   */
  const preheaderHtml = message.preheader
    ? `<div style="display:none;font-size:1px;color:${PAPER};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${esc(message.preheader)}${"&#847;&zwnj;&nbsp;".repeat(60)}</div>`
    : "";

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
<!--[if mso]><style>body,table,td,a{font-family:Arial,Helvetica,sans-serif !important}</style><![endif]-->
</head><body style="margin:0;padding:0;background:${PAPER};-webkit-font-smoothing:antialiased;">
${preheaderHtml}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${PAPER}" style="background:${PAPER};">
  <tr><td align="center" style="padding:28px 14px 36px 14px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;border-collapse:collapse;font-family:Helvetica,Arial,sans-serif;">
      <tr><td bgcolor="${NAVY}" style="background:${NAVY};border-radius:16px 16px 0 0;padding:22px 30px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="font-size:21px;font-weight:800;letter-spacing:-0.5px;color:#ffffff;">True<span style="font-weight:400;color:#b9c4e6;">Lend</span></td>
          ${message.brandTag ? `<td align="right" style="font-size:10px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#8fa0d4;">${esc(message.brandTag)}</td>` : ""}
        </tr></table>
      </td></tr>
      <tr><td bgcolor="#ffffff" style="background:#ffffff;padding:32px 30px 34px 30px;border-left:1px solid #e7e2d8;border-right:1px solid #e7e2d8;">
        ${body}
      </td></tr>
      <tr><td bgcolor="#ffffff" style="background:#ffffff;border-radius:0 0 16px 16px;border-left:1px solid #e7e2d8;border-right:1px solid #e7e2d8;border-bottom:1px solid #e7e2d8;padding:0 30px 26px 30px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td bgcolor="#e7e2d8" style="background:#e7e2d8;font-size:0;line-height:0;height:1px;">&nbsp;</td>
        </tr></table>
        <p style="margin:16px 0 0 0;font-size:12px;line-height:1.6;color:${MUTED};">
          <strong style="color:${NAVY};">TrueLend</strong> &middot; Lending Choices, Simplified.
        </p>
      </td></tr>
      ${message.reason ? `<tr><td style="padding:16px 8px 0 8px;font-size:11px;line-height:1.6;color:#9aa5c4;">${esc(message.reason)}</td></tr>` : ""}
    </table>
  </td></tr>
</table>
</body></html>`;

  const lines = [message.heading, ""];
  for (const paragraph of message.paragraphs) lines.push(textOf(paragraph), "");
  if (message.highlight) {
    lines.push(`${message.highlight.label}: ${message.highlight.value}`, "");
  }
  if (message.progress) {
    const { stages, current, caption } = message.progress;
    if (caption) lines.push(caption.toUpperCase(), "");
    // "→", not ">": the text part is asserted to carry no angle bracket at all,
    // which is what makes "no markup leaked" checkable with one cheap rule.
    lines.push(
      stages.map((stage, index) => (index === current ? `[${stage}]` : stage)).join("  →  "),
      "",
    );
  }
  if (steps) {
    if (steps.caption) lines.push(steps.caption.toUpperCase(), "");
    steps.items.forEach((step, index) => {
      lines.push(`${step.done ? "[done]" : `${index + 1}.`} ${textOf(step.title)}`);
      lines.push(indent(textOf(step.body)), "");
    });
  }
  for (const [label, value] of rows) lines.push(`${label}: ${value}`);
  if (rows.length > 0) lines.push("");
  if (href && message.action) lines.push(`${message.action.label}: ${href}`, "");
  if (message.footnote) lines.push(textOf(message.footnote), "");
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
      /*
       * An operations alert, not a campaign. Whoever opens this is deciding
       * whether to pick up the phone in the next ten seconds, so the number
       * they will dial is the one thing given any weight — no walkthrough, no
       * pipeline, nothing to scroll past.
       */
      brandTag: "Team alert",
      eyebrow: lead.source,
      heading: lead.name ?? "New lead",
      preheader: [lead.product, lead.city, lead.phone].filter(Boolean).join(" · "),
      paragraphs: [],
      highlight: lead.phone
        ? {
            label: "Call them on",
            value: lead.phone,
            caption: "Reply to this email to reach them by mail instead.",
          }
        : undefined,
      rows,
      reason: "You are receiving this because you are on the TrueLend team inbox.",
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
      brandTag: "Team alert",
      eyebrow: "Access change",
      heading: created ? "Staff account created" : "Staff role changed",
      preheader: `${info.staffEmail} — ${info.role}`,
      paragraphs: [
        created
          ? "A new staff account now has access to the admin console."
          : "An existing staff account was given a different role.",
      ],
      rows,
      footnote:
        "If this change was not expected, review it in the admin console straight away — console access carries applicant contact details.",
      reason: "You are receiving this because you are on the TrueLend team inbox.",
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
  /*
   * Only a loan enquiry has a journey to describe. Someone who asked to hear
   * when CIBIL tracking launches is not in a pipeline, and drawing them one
   * would promise a callback nobody is going to make.
   */
  const inPipeline = kind === "enquiry" || kind === "referral";

  return send(
    env,
    "lead_received",
    env.EMAIL_FROM,
    info.to,
    copy.subject,
    {
      eyebrow: kind === "cibil_notify" ? "You're on the list" : "Received",
      heading: copy.heading,
      paragraphs: [
        `Hi ${esc(firstName(info.name))}, thank you for reaching out to TrueLend.`,
        middle,
        copy.closing,
      ],
      preheader: inPipeline
        ? "An advisor will call you shortly. Here's what happens next."
        : undefined,
      steps: inPipeline
        ? {
            caption: "What happens next",
            items: [
              {
                done: true,
                icon: "&#128231;",
                title: "We have your details",
                body: "Nothing more is needed from you right now.",
              },
              {
                icon: "&#128222;",
                title: "An advisor calls you",
                body: "A Borrowing Advisor reviews what you sent and rings you to understand what you actually need — usually the same working day.",
              },
              {
                icon: "&#127974;",
                title: "We match you to lenders",
                body: "We compare offers across our lending partners and come back with the options that genuinely fit, not just the first yes.",
              },
              {
                icon: "&#128176;",
                title: "Approval and disbursal",
                body: "We stay with you through paperwork, approval and the money reaching your account — and email you at each stage.",
              },
            ],
          }
        : undefined,
      footnote: "Never share your OTP or passwords. TrueLend will never ask for them.",
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
      eyebrow: "Your form",
      heading: "Here's your enquiry form",
      preheader: "Two minutes to fill in, and an advisor takes it from there.",
      paragraphs: [
        `Hi ${esc(firstName(info.name))}, thanks for speaking with us just now.`,
        "Fill in this short form and a Borrowing Advisor will pick it up from there.",
      ],
      highlight: {
        label: "Time to complete",
        value: "2 minutes",
        caption: "Name, contact details, and roughly what you're looking to borrow.",
      },
      footnote:
        "If anything looks wrong, or you'd rather we filled it in for you over the phone, just reply to this email. Never share your OTP or passwords — TrueLend will never ask for them.",
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

/*
 * The applicant-facing pipeline, drawn on every status email so the reader can
 * see the whole road and where they stand on it — not just the one stage that
 * happened to change. "Received" is stage 0 and is always behind them, since a
 * status email cannot exist before their details arrived.
 */
const customerStages = ["Received", "Advisor review", "Approved", "Disbursed"];

const customerLeadStatusCopy: Readonly<
  Record<
    CustomerLeadStatus,
    {
      subject: string;
      eyebrow: string;
      heading: string;
      body: string;
      stage: number;
      tone?: "good" | "bad";
      next: string;
    }
  >
> = {
  contacted: {
    subject: "Your TrueLend application is being reviewed",
    eyebrow: "In progress",
    heading: "We're on it",
    body: "An advisor has picked up your application and will be in touch to confirm your details.",
    stage: 1,
    next: "Keep your phone handy — your advisor will call to confirm a few details before anything goes to a lender.",
  },
  approved: {
    subject: "Good news about your TrueLend application",
    eyebrow: "Approved",
    heading: "Your application is approved",
    body: "The lender has approved your loan application. We'll walk you through the remaining steps and disbursal.",
    stage: 2,
    next: "Your advisor will confirm the final paperwork. Once that's signed, disbursal is the last step.",
  },
  disbursed: {
    subject: "Your TrueLend loan has been disbursed",
    eyebrow: "Complete",
    heading: "Your loan is disbursed",
    body: "The lender has disbursed your loan. Thank you for choosing TrueLend.",
    stage: 3,
    next: "The funds are on their way to the account you nominated. Bank processing can take a working day to show up.",
  },
  declined: {
    subject: "An update on your TrueLend application",
    eyebrow: "Update",
    heading: "An update on your application",
    body: "The lender was not able to approve this application. That isn't the end of the road — your advisor can talk you through the options that may suit you better.",
    stage: 2,
    tone: "bad",
    next: "One lender's no is not every lender's no. Your advisor can look at different products, a different amount, or a co-applicant.",
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
      eyebrow: copy.eyebrow,
      heading: copy.heading,
      preheader: textOf(copy.body).slice(0, 120),
      paragraphs: [`Hi ${esc(firstName(info.name))},`, copy.body],
      progress: {
        caption: "Your application",
        stages:
          // A declined application stops where it stopped; showing "Disbursed"
          // greyed out beyond it reads as a step still to come.
          copy.tone === "bad" ? [...customerStages.slice(0, 2), "Not approved"] : customerStages,
        current: copy.stage,
        tone: copy.tone,
      },
      footnote: `<strong>What happens next:</strong> ${copy.next} Reply to this email with any questions — it reaches your advisor.`,
      reason: "You are receiving this because you submitted an enquiry to TrueLend.",
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
    "Welcome to TrueLend — here's what happens next",
    {
      brandTag: "Referral Partners",
      preheader: `Your Partner ID is ${info.referenceId}. Here are the seven steps from here to your first payout.`,
      eyebrow: "Welcome",
      heading: `You're in, ${firstName(info.name)}`,
      paragraphs: [
        "Your Referral Partner account is created. Everything from here is a short, one-time setup — then you can start referring customers and earning on every loan that lands.",
        "Here is the whole journey, start to finish, so nothing takes you by surprise.",
      ],
      highlight: {
        label: "Your Referral Partner ID",
        value: info.referenceId,
        caption: "Quote this any time you contact us — it pulls up your whole file instantly.",
      },
      steps: {
        caption: "How it works",
        items: [
          {
            done: true,
            icon: "&#127881;",
            title: "Account created",
            body: "Done — that's this email. Nothing else to do on this step.",
          },
          {
            icon: "&#128203;",
            title: "Complete your profile and KYC",
            body:
              "Sign in and fill in your PAN, address, occupation, bank account details and nominee. Then upload four documents:" +
              `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:10px 0 4px 0;background:${PAPER};border-radius:8px;"><tr><td style="padding:10px 14px;font-size:13px;line-height:1.9;color:${NAVY};">` +
              "&#10003;&nbsp; PAN card<br>&#10003;&nbsp; Aadhaar card<br>&#10003;&nbsp; Passport-size photo<br>&#10003;&nbsp; Cancelled cheque" +
              "</td></tr></table>" +
              "The cheque is how we pay you, so make sure the account details match it exactly.",
          },
          {
            icon: "&#128228;",
            title: "Submit for review",
            body: "One button, once everything is in. Your details lock at that point so nothing changes underneath our check — you'll still be able to see everything you submitted.",
          },
          {
            icon: "&#128269;",
            title: "We verify you",
            body: "Our team reviews applications within <strong>two working days</strong> and emails you either way. If something needs correcting we'll tell you exactly what, unlock your form, and you can resubmit — no penalty, no starting over.",
          },
          {
            icon: "&#129309;",
            title: "Start referring customers",
            body: "Once verified, refer someone in under a minute from your dashboard — or share your personal referral link and QR code and let them apply themselves.",
          },
          {
            icon: "&#128200;",
            title: "Track every referral to disbursal",
            body: "Each referral moves through your pipeline — contacted, documents, approved, disbursed — and you get an email at every stage. No chasing anyone for updates.",
          },
          {
            icon: "&#128176;",
            title: "Get paid",
            // "incentive" matches referralRewardLabel in @truelend/reference.
            // Spelled out rather than imported: this package is deliberately
            // dependency-free, and one word is not worth the coupling.
            body: "Your incentive is recorded against a referral the moment it qualifies, and again when the money actually reaches your account. Both land on your earnings page and in your inbox.",
          },
        ],
      },
      action: { href: info.dashboardUrl, label: "Complete your application" },
      footnote:
        "Button not working? Copy the link into your browser. And if you get stuck at any point, just reply to this email — a real person reads it.",
      reason: "You are receiving this because you registered as a TrueLend Referral Partner.",
    },
    { idempotencyKey: info.idempotencyKey },
  );
}

/*
 * The partner onboarding road, shared by every email that sits on it so the
 * stage names never drift between the "received" mail and the decision mail.
 */
const partnerOnboardingStages = ["Registered", "KYC submitted", "Under review", "Verified"];

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
      brandTag: "Referral Partners",
      eyebrow: "Under review",
      heading: "Application received",
      preheader: "A decision within two working days. Nothing needed from you until then.",
      paragraphs: [
        `Hi ${esc(firstName(info.name))}, your Referral Partner application and documents are in — thank you.`,
        "There is nothing for you to do until you hear from us.",
      ],
      // The same journey the welcome email laid out, so a partner can see how
      // far along they are rather than being told a stage name in isolation.
      progress: {
        caption: "Where you are",
        stages: partnerOnboardingStages,
        current: 2,
      },
      steps: {
        caption: "What happens now",
        items: [
          {
            icon: "&#128269;",
            title: "We check your documents",
            body: "A member of our team goes through your details and the four documents you uploaded, against the account you gave us for payouts.",
          },
          {
            icon: "&#128274;",
            title: "Your details stay locked",
            body: "Nothing can change underneath the review — you can still see everything you submitted, you just can't edit it while we're looking.",
          },
          {
            icon: "&#9200;",
            title: "A decision within two working days",
            body: "We email you either way. If anything needs correcting we'll say exactly what, unlock your form, and you can resubmit — no penalty, no starting over.",
          },
        ],
      },
      action: { href: info.dashboardUrl, label: "View your application" },
      reason: "You are receiving this because you applied to be a TrueLend Referral Partner.",
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

interface PartnerDecisionCopy {
  subject: string;
  eyebrow: string;
  heading: string;
  preheader: string;
  body: string;
  action: string;
  /** Index into partnerOnboardingStages; omitted where a road diagram would mislead. */
  stage?: number;
  tone?: "good" | "bad";
  steps?: { caption: string; items: MessageStep[] };
  footnote?: string;
}

const partnerDecisionCopy: Readonly<Record<PartnerDecision, PartnerDecisionCopy>> = {
  verified: {
    subject: "You're verified — start referring today",
    eyebrow: "Verified",
    heading: "You're verified",
    preheader: "Your account is live. Here are the three ways to send your first referral.",
    body: "your TrueLend Referral Partner account has been verified. Everything is unlocked — you can start referring customers today.",
    action: "Go to your dashboard",
    stage: 3,
    steps: {
      caption: "Three ways to refer",
      items: [
        {
          icon: "&#9997;",
          title: "Add someone yourself",
          body: "Name and phone number is enough to start. It takes under a minute from your dashboard, and an advisor picks it up from there.",
        },
        {
          icon: "&#128279;",
          title: "Share your referral link",
          body: "Your own link and QR code sit in your dashboard. Anyone who applies through them is credited to you automatically — nothing to key in.",
        },
        {
          icon: "&#128200;",
          title: "Then watch it move",
          body: "Every referral shows its live stage in your pipeline, and you get an email each time one advances. Your incentive is recorded the moment it qualifies.",
        },
      ],
    },
    footnote: "Your Referral Partner ID is on your dashboard — quote it any time you contact us.",
  },
  rejected: {
    subject: "Action needed on your TrueLend Referral Partner application",
    eyebrow: "Action needed",
    heading: "Your application needs a correction",
    preheader: "One thing to fix, then resubmit. Your form is unlocked again.",
    body: "we couldn't verify your application as it stands. This is normally something small — a document that didn't scan cleanly, or a detail that doesn't match your bank account.",
    action: "Update your application",
    stage: 2,
    tone: "bad",
    steps: {
      caption: "How to fix it",
      items: [
        {
          icon: "&#128275;",
          title: "Your form is unlocked",
          body: "Everything you already entered is still there. You only need to change what the reason above refers to.",
        },
        {
          icon: "&#128260;",
          title: "Correct it and resubmit",
          body: "Same submit button as before. There is no penalty for resubmitting and you don't start over.",
        },
        {
          icon: "&#9200;",
          title: "We review it again",
          body: "Back to two working days, and we email you either way.",
        },
      ],
    },
    footnote: "Not sure what to change? Reply to this email and we'll tell you exactly.",
  },
  revoked: {
    subject: "Your TrueLend Referral Partner verification has been paused",
    eyebrow: "Paused",
    heading: "Your verification has been paused",
    preheader: "Your existing referrals and earnings are unaffected.",
    body: "your Referral Partner verification has been paused and your application is back under review.",
    action: "View your application",
    tone: "bad",
    steps: {
      caption: "What this means",
      items: [
        {
          icon: "&#128203;",
          title: "Your existing referrals are safe",
          body: "Every lead you have already submitted carries on through the pipeline exactly as before, and anything already earned stays on your ledger.",
        },
        {
          icon: "&#9209;",
          title: "New referrals are paused",
          body: "You won't be able to submit new referrals until the review finishes.",
        },
        {
          icon: "&#128172;",
          title: "Talk to us",
          body: "If the reason above isn't clear, or you think it's a mistake, reply to this email — a person reads it.",
        },
      ],
    },
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
  return send(
    env,
    "partner_decision",
    from,
    info.to,
    copy.subject,
    {
      brandTag: "Referral Partners",
      eyebrow: copy.eyebrow,
      heading: copy.heading,
      preheader: copy.preheader,
      paragraphs: [`Hi ${esc(firstName(info.name))}, ${copy.body}`],
      /*
       * The admin's own words, carried in the callout rather than buried in a
       * paragraph: on a rejection it is the only thing the reader actually has
       * to act on, and it must not be something they skim past.
       */
      highlight: info.reason
        ? {
            label: copy.tone === "bad" ? "What needs attention" : "Note from our team",
            value: info.reason,
            variant: "note",
            tone: copy.tone,
          }
        : undefined,
      progress:
        copy.stage !== undefined
          ? {
              caption: "Where you are",
              stages: partnerOnboardingStages,
              current: copy.stage,
              tone: copy.tone,
            }
          : undefined,
      steps: copy.steps,
      action: { href: info.loginUrl, label: copy.action },
      footnote: copy.footnote,
      reason: "You are receiving this because you applied to be a TrueLend Referral Partner.",
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
  return send(
    env,
    "partner_payout",
    from,
    info.to,
    paid ? `Payment sent: ${info.amount}` : `Incentive recorded: ${info.amount}`,
    {
      brandTag: "Referral Partners",
      eyebrow: paid ? "Payment sent" : "Incentive earned",
      heading: paid ? "A payment is on its way" : "You've earned an incentive",
      preheader: paid
        ? `${info.amount} is on its way to your account.`
        : `${info.amount} added to your ledger.`,
      paragraphs: [
        paid
          ? `Hi ${esc(firstName(info.name))}, we've sent you a payment and recorded it on your Referral Partner ledger.`
          : `Hi ${esc(firstName(info.name))}, one of your referrals qualified, so we've credited your Referral Partner ledger.`,
      ],
      // The amount IS the message. Everything else on this email is context.
      highlight: {
        label: paid ? "Payment sent" : "Incentive earned",
        value: info.amount,
        caption: info.note ?? undefined,
      },
      steps: {
        caption: paid ? "About this payment" : "What happens next",
        items: paid
          ? [
              {
                icon: "&#127974;",
                title: "Sent to your registered account",
                body: "The account on the cancelled cheque you gave us at KYC. Bank processing can take a working day to show up at your end.",
              },
              {
                icon: "&#129534;",
                title: "Your balance is updated",
                body: "Your earnings page shows the full ledger and what remains outstanding.",
              },
            ]
          : [
              {
                icon: "&#129534;",
                title: "It's on your ledger now",
                body: "Earned, not yet sent. Your earnings page shows the running balance of everything credited but not paid out.",
              },
              {
                icon: "&#128176;",
                title: "We pay it out",
                body: "You'll get a second email the moment the money is actually sent to your registered account.",
              },
            ],
      },
      action: { href: info.dashboardUrl, label: "View your ledger" },
      reason: "You are receiving this because you are a TrueLend Referral Partner.",
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

const partnerLeadStatusEyebrow: Readonly<Record<PartnerLeadStatus, string>> = {
  new: "New referral",
  contacted: "In progress",
  logged_in: "With the lender",
  approved: "Approved",
  declined: "Update",
  disbursed: "Disbursed",
};

/*
 * The funnel a partner watches. One stage longer than the applicant's, because
 * "logged in with a lender" is the step partners ask about most and the
 * applicant has no reason to care about.
 */
const partnerPipelineStages = [
  "Received",
  "Advisor review",
  "With lender",
  "Approved",
  "Disbursed",
];

const partnerPipelineStage: Readonly<Record<PartnerLeadStatus, number>> = {
  new: 0,
  contacted: 1,
  logged_in: 2,
  approved: 3,
  declined: 3,
  disbursed: 4,
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
  const declined = info.status === "declined";
  const stage = partnerPipelineStage[info.status];
  return send(
    env,
    "partner_lead_status",
    from,
    info.to,
    arrived
      ? `New referral received: ${info.leadName}`
      : `Update on your referral: ${info.leadName}`,
    {
      brandTag: "Referral Partners",
      eyebrow: arrived ? "New referral" : partnerLeadStatusEyebrow[info.status],
      heading: arrived
        ? "A new lead came in through your link"
        : declined
          ? "An update on your referral"
          : "Your referral moved forward",
      preheader: `${info.leadName} ${textOf(partnerLeadStatusCopy[info.status])}.`,
      paragraphs: [
        `Hi ${esc(firstName(info.name))}, your referral <strong>${esc(info.leadName)}</strong> ${partnerLeadStatusCopy[info.status]}.`,
      ],
      progress: {
        caption: `Progress for ${info.leadName}`,
        // A declined referral stops where it stopped; carrying "Disbursed" on
        // past it greyed out would read as a stage still to come.
        stages: declined
          ? [...partnerPipelineStages.slice(0, 3), "Not approved"]
          : partnerPipelineStages,
        current: declined ? 3 : stage,
        tone: declined ? "bad" : "good",
      },
      footnote: declined
        ? "A lender declining is not the end of it — an advisor will look at other products and lenders for them, and this referral stays yours if it goes ahead."
        : "Your incentive is recorded automatically the moment this referral qualifies. Nothing to claim.",
      action: { href: info.dashboardUrl, label: "Open your dashboard" },
      reason: "You are receiving this because you are a TrueLend Referral Partner.",
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
  /*
   * Deliberately the plainest message in the file. A security email that looks
   * like a campaign teaches people to trust decorated mail asking them to click
   * something — no step timeline, no progress bar, nothing to scroll past
   * before the one thing they came for.
   */
  return send(env, "password_reset", env.EMAIL_FROM, info.to, "Reset your TrueLend password", {
    eyebrow: "Security",
    heading: "Reset your password",
    preheader: "This link expires in one hour. Ignore this email if it wasn't you.",
    paragraphs: [
      `Hi ${esc(firstName(info.name))}, we received a request to reset your TrueLend password.`,
      "Choose a new one using the button below.",
    ],
    highlight: {
      label: "This link expires in",
      value: "1 hour",
      caption: "After that you'll need to request a new one.",
    },
    action: { href: info.url, label: "Reset password" },
    footnote:
      "If you didn't request this, you can safely ignore this email — your password stays as it is. TrueLend will never ask you for your password or an OTP by email or phone.",
  });
}
