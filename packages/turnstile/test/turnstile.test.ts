import assert from "node:assert/strict";
import test from "node:test";
import { verifyTurnstile } from "../src/server";

const base = {
  token: "token",
  secret: "secret",
  siteKeyConfigured: true,
  expectedAction: "lead_enquiry" as const,
  production: true,
};

function siteverify(body: object, ok = true): typeof fetch {
  return async () => Response.json(body, { status: ok ? 200 : 503 });
}

void test("production fails closed when either Turnstile key is missing", async () => {
  assert.equal(await verifyTurnstile({ ...base, secret: undefined }), false);
  assert.equal(await verifyTurnstile({ ...base, siteKeyConfigured: false }), false);
});

void test("local development can run without Turnstile credentials", async () => {
  assert.equal(await verifyTurnstile({ ...base, secret: undefined, production: false }), true);
});

void test("tokens must match both the form action and hostname", async () => {
  assert.equal(
    await verifyTurnstile({
      ...base,
      fetchImpl: siteverify({ success: true, action: "lead_enquiry", hostname: "truelend.in" }),
    }),
    false,
  );
  assert.equal(
    await verifyTurnstile({
      ...base,
      expectedHostname: "truelend.in",
      fetchImpl: siteverify({ success: true, action: "lead_contact", hostname: "truelend.in" }),
    }),
    false,
  );
  assert.equal(
    await verifyTurnstile({
      ...base,
      expectedHostname: "truelend.in",
      fetchImpl: siteverify({ success: true, action: "lead_enquiry", hostname: "evil.example" }),
    }),
    false,
  );
  assert.equal(
    await verifyTurnstile({
      ...base,
      expectedHostname: "truelend.in:443",
      fetchImpl: siteverify({ success: true, action: "lead_enquiry", hostname: "truelend.in" }),
    }),
    true,
  );
});

void test("missing and invalid tokens are rejected", async () => {
  assert.equal(await verifyTurnstile({ ...base, token: undefined }), false);
  assert.equal(
    await verifyTurnstile({
      ...base,
      fetchImpl: siteverify({ success: false, "error-codes": ["invalid-input-response"] }),
    }),
    false,
  );
});
