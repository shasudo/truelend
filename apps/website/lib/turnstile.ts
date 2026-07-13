// Env-gated Cloudflare Turnstile verification: with no secret configured
// (local dev, preview without keys) submissions pass through.
export async function verifyTurnstile(
  token: string | undefined,
  secret: string | undefined,
  ip?: string,
): Promise<boolean> {
  // Turnstile needs BOTH keys. Unconfigured → fail CLOSED in production: a
  // missing key must never wave real traffic through. Local/preview dev without
  // keys still passes so forms stay testable. NODE_ENV is inlined at build, so
  // this is a compile-time constant in the deployed Worker.
  // ponytail: a CI assert that both keys are set would turn a misconfigured
  // prod deploy into a build failure instead of a runtime lead-reject — add
  // that env check to the deploy job if this ever bites.
  if (!secret || !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
    return process.env.NODE_ENV !== "production";
  }
  if (!token) return false;

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { success: boolean };
  return data.success;
}
