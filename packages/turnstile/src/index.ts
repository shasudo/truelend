export const turnstileActions = [
  "lead_enquiry",
  "lead_referral",
  "lead_contact",
  "lead_cibil_notify",
  "partner_registration",
] as const;

export type TurnstileAction = (typeof turnstileActions)[number];

interface TurnstileResponse {
  success?: boolean;
  hostname?: string;
  action?: string;
}

interface VerifyTurnstileOptions {
  token: string | undefined;
  secret: string | undefined;
  siteKeyConfigured: boolean;
  expectedAction: TurnstileAction;
  ip?: string;
  expectedHostname?: string;
  production?: boolean;
  fetchImpl?: typeof fetch;
}

function normalizedHostname(hostname: string | undefined): string | undefined {
  return hostname?.split(":")[0]?.trim().toLowerCase() || undefined;
}

export async function verifyTurnstile({
  token,
  secret,
  siteKeyConfigured,
  expectedAction,
  ip,
  expectedHostname,
  production = process.env.NODE_ENV === "production",
  fetchImpl = fetch,
}: VerifyTurnstileOptions): Promise<boolean> {
  if (!secret || !siteKeyConfigured) {
    if (production) {
      console.error(
        JSON.stringify({
          event: "turnstile_unconfigured",
          severity: "critical",
          action: expectedAction,
        }),
      );
      return false;
    }
    return true;
  }
  if (!token) return false;
  const expected = normalizedHostname(expectedHostname);
  if (production && !expected) {
    console.error(
      JSON.stringify({
        event: "turnstile_hostname_unavailable",
        severity: "critical",
        action: expectedAction,
      }),
    );
    return false;
  }

  try {
    const response = await fetchImpl("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: token,
        idempotency_key: crypto.randomUUID(),
        ...(ip ? { remoteip: ip } : {}),
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return false;

    const result = (await response.json()) as TurnstileResponse;
    if (result.success !== true || result.action !== expectedAction) return false;

    const actual = normalizedHostname(result.hostname);
    if (expected && expected !== "localhost" && expected !== actual) return false;

    return true;
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "turnstile_verification_error",
        action: expectedAction,
        error: error instanceof Error ? error.message : "unknown",
      }),
    );
    return false;
  }
}
