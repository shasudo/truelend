export const ATTRIBUTION_TTL_MS = 30 * 24 * 60 * 60 * 1_000;

interface UtmTouch {
  source?: string;
  medium?: string;
  campaign?: string;
}

export interface LeadAttribution {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmLastSource?: string;
  utmLastMedium?: string;
  utmLastCampaign?: string;
  /** Partner reference id (BP…/RP…) from a shared affiliate link. */
  ref?: string;
}

interface StoredAttribution {
  first: UtmTouch;
  last: UtmTouch;
  ref?: string;
  expiresAt: number;
}

const clean = (value: unknown) =>
  typeof value === "string" ? value.trim().slice(0, 100) || undefined : undefined;

// Partner reference ids are BP/RP + a sequence number; reject anything else so a
// hostile ?ref= can't smuggle junk into storage or the lead payload.
const REF_RE = /^(?:BP|RP)\d{4,}$/;
function sanitizeRef(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim().toUpperCase().slice(0, 32);
  return REF_RE.test(v) ? v : undefined;
}

export function refFromSearch(params: URLSearchParams): string | undefined {
  return sanitizeRef(params.get("ref"));
}

function sanitizeTouch(value: unknown): UtmTouch {
  if (!value || typeof value !== "object") return {};
  const touch = value as Record<string, unknown>;
  return {
    source: clean(touch.source),
    medium: clean(touch.medium),
    campaign: clean(touch.campaign),
  };
}

const hasTouch = (touch: UtmTouch) => Boolean(touch.source || touch.medium || touch.campaign);

export function touchFromSearch(params: URLSearchParams): UtmTouch {
  return sanitizeTouch({
    source: params.get("utm_source"),
    medium: params.get("utm_medium"),
    campaign: params.get("utm_campaign"),
  });
}

export function resolveAttribution(
  storedRaw: string | null,
  current: UtmTouch,
  now = Date.now(),
  currentRef?: string,
): { fields: LeadAttribution; serialized?: string } {
  let stored: StoredAttribution | undefined;
  if (storedRaw && storedRaw.length <= 4_096) {
    try {
      const value: unknown = JSON.parse(storedRaw);
      if (value && typeof value === "object") {
        const candidate = value as Record<string, unknown>;
        if (typeof candidate.expiresAt === "number" && candidate.expiresAt > now) {
          stored = {
            first: sanitizeTouch(candidate.first),
            last: sanitizeTouch(candidate.last),
            ref: sanitizeRef(candidate.ref),
            expiresAt: candidate.expiresAt,
          };
        }
      }
    } catch {
      // Corrupt or hostile storage is treated as absent attribution.
    }
  }

  const cleanCurrent = sanitizeTouch(current);
  // First partner to refer keeps the credit; a later ?ref= does not overwrite.
  const ref = stored?.ref ?? sanitizeRef(currentRef);

  if (hasTouch(cleanCurrent)) {
    stored = {
      first: stored && hasTouch(stored.first) ? stored.first : cleanCurrent,
      last: cleanCurrent,
      ref,
      expiresAt: now + ATTRIBUTION_TTL_MS,
    };
  } else if (ref && !stored) {
    // Referral link with no UTM: still persist so the credit survives navigation.
    stored = { first: {}, last: {}, ref, expiresAt: now + ATTRIBUTION_TTL_MS };
  } else if (stored) {
    stored = { ...stored, ref };
  }

  if (!stored) return { fields: {} };
  const fields: LeadAttribution = {
    utmSource: stored.first.source,
    utmMedium: stored.first.medium,
    utmCampaign: stored.first.campaign,
    utmLastSource: stored.last.source,
    utmLastMedium: stored.last.medium,
    utmLastCampaign: stored.last.campaign,
  };
  if (stored.ref) fields.ref = stored.ref;
  return { fields, serialized: JSON.stringify(stored) };
}
