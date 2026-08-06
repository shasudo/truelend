import assert from "node:assert/strict";
import test from "node:test";
import {
  notifyLeadStatusChanged,
  notifyNewLead,
  notifyPartnerDecision,
  notifyPartnerRegistration,
  sendPasswordReset,
} from "../src/index";

const provider = {
  RESEND_API_KEY: "synthetic-api-key",
  EMAIL_FROM: "TrueLend <hello@example.test>",
  PARTNER_EMAIL: "TrueLend Referral Partners <partner@example.test>",
  TEAM_EMAIL: "team@example.test",
};

interface Capture {
  bodies: Record<string, unknown>[];
  keys: string[];
}

/** Captures what would have been sent, and restores globals afterwards. */
async function capture(
  run: () => Promise<unknown>,
  status: (call: number) => number = () => 200,
): Promise<Capture> {
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  const captured: Capture = { bodies: [], keys: [] };
  let calls = 0;

  globalThis.fetch = async (_input, init) => {
    calls += 1;
    captured.bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    captured.keys.push(new Headers(init?.headers).get("Idempotency-Key") ?? "");
    return new Response(null, { status: status(calls) });
  };
  console.warn = () => undefined;
  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
  }
  return captured;
}

void test("email failures log bounded metadata without provider bodies or message content", async () => {
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  const messages: string[] = [];
  const providerBody = "provider diagnostic containing private payload";

  globalThis.fetch = async () => new Response(providerBody, { status: 422 });
  console.error = (...values: unknown[]) => messages.push(values.map(String).join(" "));
  try {
    const result = await sendPasswordReset(provider, {
      to: "recipient@example.test",
      name: "Synthetic User",
      url: "https://example.test/reset?token=synthetic-token",
    });

    assert.deepEqual(result, {
      ok: false,
      error: "Email provider rejected the request (422)",
      status: 422,
    });
    const logged = messages.join("\n");
    assert.match(logged, /"context":"password_reset"/);
    assert.match(logged, /"status":422/);
    assert.doesNotMatch(logged, /private payload|recipient|synthetic-token/);
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalError;
  }
});

void test("Referral Partner registration email uses the dedicated sender", async () => {
  let result: unknown;
  const sent = await capture(async () => {
    result = await notifyPartnerRegistration(provider, {
      to: "recipient@example.test",
      name: "Synthetic Partner",
      referenceId: "RP000001",
      dashboardUrl: "https://partner.example.test/dashboard",
    });
  });

  assert.deepEqual(result, { ok: true });
  const [body] = sent.bodies;
  assert.ok(body);
  const html = body.html;
  const text = body.text;
  assert.equal(typeof html, "string");
  assert.equal(typeof text, "string");
  if (typeof html !== "string" || typeof text !== "string") {
    throw new TypeError("Expected HTML and text email bodies");
  }
  assert.match(html, /RP000001/);
  assert.match(html, /Cancelled cheque|cancelled cheque/);
  assert.doesNotMatch(html, /application has been submitted/);
  assert.deepEqual(body, {
    from: "TrueLend Referral Partners <partner@example.test>",
    to: ["recipient@example.test"],
    subject: "Welcome to TrueLend — here's what happens next",
    html,
    text,
  });

  /*
   * The walkthrough is the point of this email, so the plain-text part has to
   * carry it too — a text/plain reader must not be left with a heading and a
   * bare link where the HTML reader gets seven numbered steps.
   */
  assert.match(text, /Your Referral Partner ID: RP000001/);
  assert.match(text, /\[done\] Account created/);
  assert.match(text, /^7\. Get paid$/m);
  assert.doesNotMatch(text, /<[a-z]/i);

  /*
   * The layout writes icons and ticks as numeric entities, which a text reader
   * must receive as characters — an undecoded "&#10003;" beside every required
   * document is worse than no tick at all. The checklist must also survive as
   * separate lines: stripping the markup is what removed the only separation.
   */
  assert.doesNotMatch(text, /&#\d+;|&nbsp;|&amp;/);
  assert.match(text, /^ +✓ PAN card$/m);
  assert.match(text, /^ +✓ Cancelled cheque$/m);
});

void test("transient provider failures retry with one idempotency key", async () => {
  let result: unknown;
  const sent = await capture(
    async () => {
      result = await sendPasswordReset(provider, {
        to: "recipient@example.test",
        name: "Synthetic User",
        url: "https://example.test/reset?token=synthetic-token",
      });
    },
    (call) => (call === 1 ? 503 : 200),
  );

  assert.deepEqual(result, { ok: true });
  assert.equal(sent.keys.length, 2);
  assert.equal(sent.keys[0], sent.keys[1]);
  assert.match(sent.keys[0] ?? "", /^[0-9a-f-]{36}$/i);
});

void test("a caller-supplied idempotency key is what reaches the provider", async () => {
  const sent = await capture(() =>
    notifyPartnerDecision(provider, {
      to: "recipient@example.test",
      name: "Synthetic Partner",
      decision: "verified",
      loginUrl: "https://partner.example.test/login",
      idempotencyKey: "partner_decision:user-1:verified:2026-08-03T00:00:00.000Z",
    }),
  );

  assert.deepEqual(sent.keys, ["partner_decision:user-1:verified:2026-08-03T00:00:00.000Z"]);
});

void test("every partner decision renders its own outcome, and only rejection carries a reason", async () => {
  const outcomes = ["verified", "rejected", "revoked"] as const;
  const subjects: string[] = [];
  for (const decision of outcomes) {
    const sent = await capture(() =>
      notifyPartnerDecision(provider, {
        to: "recipient@example.test",
        name: "Synthetic Partner",
        decision,
        reason: decision === "rejected" ? "Aadhaar was unreadable" : null,
        loginUrl: "https://partner.example.test/login",
      }),
    );
    const [body] = sent.bodies;
    assert.ok(body);
    subjects.push(String(body.subject));
    assert.equal(
      String(body.html).includes("Aadhaar was unreadable"),
      decision === "rejected",
      `${decision} should ${decision === "rejected" ? "" : "not "}carry a reason`,
    );
  }
  assert.equal(new Set(subjects).size, outcomes.length, "each outcome needs a distinct subject");
});

void test("the plain-text part carries the message without markup", async () => {
  const sent = await capture(() =>
    notifyLeadStatusChanged(provider, {
      to: "applicant@example.test",
      name: "Synthetic Applicant",
      status: "approved",
    }),
  );

  const text = String(sent.bodies[0]?.text);
  assert.doesNotMatch(text, /[<>]/);
  assert.match(text, /Your application is approved/);
  assert.match(text, /Hi Synthetic,/);
});

void test("the new-lead alert goes to the team inbox, drops blank fields, and replies to the lead", async () => {
  const sent = await capture(() =>
    notifyNewLead(provider, {
      name: "Synthetic Applicant",
      phone: "9876543210",
      email: "applicant@example.test",
      city: null,
      product: undefined,
      source: "Website · Enquiry",
    }),
  );

  const [body] = sent.bodies;
  assert.ok(body);
  assert.deepEqual(body.to, ["team@example.test"]);
  assert.equal(body.reply_to, "applicant@example.test");
  const text = String(body.text);
  assert.match(text, /Phone: 9876543210/);
  assert.doesNotMatch(text, /City:|Product:/);
});

void test("a link that is not http(s) is refused rather than delivered", () => {
  // Thrown synchronously, before any fetch: best-effort callers run inside a
  // background-task wrapper that logs it, and password reset fails closed.
  assert.throws(
    () =>
      notifyPartnerRegistration(provider, {
        to: "recipient@example.test",
        name: "Synthetic Partner",
        referenceId: "RP000001",
        dashboardUrl: "javascript:alert(1)",
      }),
    /http\(s\)/,
  );
});
