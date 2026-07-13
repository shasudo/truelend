export const ATTRIBUTION_TTL_MS = 30 * 24 * 60 * 60 * 1_000;

export interface UtmTouch {
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
}

interface StoredAttribution {
  first: UtmTouch;
  last: UtmTouch;
  expiresAt: number;
}

const clean = (value: unknown) =>
  typeof value === "string" ? value.trim().slice(0, 100) || undefined : undefined;

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
            expiresAt: candidate.expiresAt,
          };
        }
      }
    } catch {
      // Corrupt or hostile storage is treated as absent attribution.
    }
  }

  const cleanCurrent = sanitizeTouch(current);
  if (hasTouch(cleanCurrent)) {
    stored = {
      first: stored && hasTouch(stored.first) ? stored.first : cleanCurrent,
      last: cleanCurrent,
      expiresAt: now + ATTRIBUTION_TTL_MS,
    };
  }

  if (!stored) return { fields: {} };
  return {
    fields: {
      utmSource: stored.first.source,
      utmMedium: stored.first.medium,
      utmCampaign: stored.first.campaign,
      utmLastSource: stored.last.source,
      utmLastMedium: stored.last.medium,
      utmLastCampaign: stored.last.campaign,
    },
    serialized: JSON.stringify(stored),
  };
}
