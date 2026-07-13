// Env-gated Cloudflare Turnstile verification: with no secret configured
// (local dev, preview without keys) submissions pass through.
export async function verifyTurnstile(
  token: string | undefined,
  secret: string | undefined,
  ip?: string,
  expectedHostname?: string,
): Promise<boolean> {
  // Turnstile needs BOTH keys. When they're configured we enforce for real
  // (missing/invalid token → reject below). When they're NOT configured we pass
  // through — rejecting here would silently drop every lead, which is worse than
  // the no-captcha status quo. In production that gap is a real problem, so make
  // it loud rather than silent.
  // /api/health also reports this as unhealthy so monitoring catches a broken
  // key pair even though lead capture deliberately stays available.
  if (!secret || !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        JSON.stringify({
          event: "turnstile_unconfigured",
          severity: "critical",
          message: "Lead spam protection is disabled",
        }),
      );
    }
    return true;
  }
  if (!token) return false;

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
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
    if (!res.ok) return false;
    const data: unknown = await res.json();
    if (!data || typeof data !== "object" || !("success" in data) || data.success !== true) {
      return false;
    }
    if (expectedHostname) {
      const expected = expectedHostname.split(":")[0]?.toLowerCase();
      const hostname = "hostname" in data && typeof data.hostname === "string" ? data.hostname : "";
      if (expected && expected !== "localhost" && hostname.toLowerCase() !== expected) {
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "turnstile_verification_error",
        error: error instanceof Error ? error.message : "unknown",
      }),
    );
    return false;
  }
}
