import { products } from "@truelend/reference";

/**
 * `?product=` on the refer/leads pages is user-controlled, so it is only
 * honoured when it names a real product. Anything else falls back to the
 * form's "Not sure / any" option rather than preselecting an unknown slug.
 */
export function preselectedProduct(raw: string | string[] | undefined): string {
  const slug = Array.isArray(raw) ? raw[0] : raw;
  return products.some((p) => p.slug === slug) ? slug! : "";
}
