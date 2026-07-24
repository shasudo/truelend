import assert from "node:assert/strict";
import test from "node:test";
import { notifyPartnerRegistration, sendPasswordReset } from "../src/index";

void test("email failures log bounded metadata without provider bodies or message content", async () => {
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  const messages: string[] = [];
  const providerBody = "provider diagnostic containing private payload";

  globalThis.fetch = async () => new Response(providerBody, { status: 422 });
  console.error = (...values: unknown[]) => messages.push(values.map(String).join(" "));
  try {
    const result = await sendPasswordReset(
      {
        RESEND_API_KEY: "synthetic-api-key",
        EMAIL_FROM: "TrueLend <test@example.test>",
      },
      {
        to: "recipient@example.test",
        name: "Synthetic User",
        url: "https://example.test/reset?token=synthetic-token",
      },
    );

    assert.deepEqual(result, {
      ok: false,
      error: "Email provider rejected the request (422)",
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
  const originalFetch = globalThis.fetch;
  let requestBody: Record<string, unknown> | undefined;

  globalThis.fetch = async (_input, init) => {
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(null, { status: 200 });
  };
  try {
    const result = await notifyPartnerRegistration(
      {
        RESEND_API_KEY: "synthetic-api-key",
        EMAIL_FROM: "TrueLend <hello@example.test>",
        PARTNER_EMAIL: "TrueLend Referral Partners <partner@example.test>",
      },
      {
        to: "recipient@example.test",
        name: "Synthetic Partner",
        referenceId: "RP000001",
        dashboardUrl: "https://partner.example.test/dashboard",
      },
    );

    assert.deepEqual(result, { ok: true });
    assert.ok(requestBody);
    const html = requestBody.html;
    assert.equal(typeof html, "string");
    if (typeof html !== "string") throw new TypeError("Expected an HTML email body");
    assert.match(html, /RP000001/);
    assert.deepEqual(requestBody, {
      from: "TrueLend Referral Partners <partner@example.test>",
      to: ["recipient@example.test"],
      subject: "We received your TrueLend Referral Partner application",
      html,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
