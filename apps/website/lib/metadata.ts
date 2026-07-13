import { site } from "@/content/site";

export function canonical(pathname: string): string {
  return new URL(pathname, site.url).toString();
}

export function completeDescription(value: string, maxLength = 160): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  const candidate = normalized.slice(0, maxLength + 1);
  const boundary = candidate.lastIndexOf(" ");
  return `${candidate.slice(0, boundary > 80 ? boundary : maxLength).trimEnd()}…`;
}

export function jsonLd(value: object): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
