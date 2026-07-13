// Env-gated Cloudflare Turnstile verification: with no secret configured
// (local dev, preview without keys) submissions pass through.
export async function verifyTurnstile(
  token: string | undefined,
  secret: string | undefined,
  ip?: string,
): Promise<boolean> {
  // Turnstile needs BOTH keys. If the secret is set but the public site key is
  // missing on a deploy, the widget never renders and no token can exist, so
  // enforcing here would reject every legitimate submission — pass through
  // instead of turning the misconfig into a silent lead-losing dead end.
  if (!secret || !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) return true;
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
