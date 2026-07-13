// Env-gated Cloudflare Turnstile verification: with no secret configured
// (local dev, preview without keys) submissions pass through.
export async function verifyTurnstile(
  token: string | undefined,
  secret: string | undefined,
  ip?: string,
): Promise<boolean> {
  // Turnstile needs BOTH keys. When they're configured we enforce for real
  // (missing/invalid token → reject below). When they're NOT configured we pass
  // through — rejecting here would silently drop every lead, which is worse than
  // the no-captcha status quo. In production that gap is a real problem, so make
  // it loud rather than silent.
  // ponytail: the durable fix is a CI/deploy gate that FAILS the prod deploy
  // when these keys are unset — turning "no spam protection" into a blocked
  // release instead of a runtime warning. Wire that once the keys are set in
  // prod (until then such a gate would block every deploy).
  if (!secret || !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
    if (process.env.NODE_ENV === "production") {
      console.error("[turnstile] NOT configured in production — lead spam protection is OFF");
    }
    return true;
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
