import assert from "node:assert/strict";
import test from "node:test";
import { sendPasswordReset } from "../src/index";

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
