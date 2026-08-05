import type { Database } from "@truelend/db";

export interface ResolvedPartner {
  userId: string;
  name: string | null;
  email: string | null;
}

export interface PartnerLookupResult {
  partner?: ResolvedPartner;
  refLookupFailed: boolean;
}

/**
 * Resolves a Referral Partner reference code to the partner it credits. A
 * rejected partner earns nothing; an unresolved code degrades to `undefined`
 * rather than throwing — attribution must never cost the caller its lead.
 */
export async function resolvePartnerByRef(
  db: Database,
  refCode: string | undefined,
  source: "lead" | "bank_apply",
): Promise<PartnerLookupResult> {
  if (!refCode) return { refLookupFailed: false };
  try {
    const rows = (await db.$client`
      select p.user_id, u.name, u.email
      from partners p join "user" u on u.id = p.user_id
      where p.reference_id = ${refCode} and p.status <> 'rejected'
      limit 1
    `) as { user_id: string; name: string | null; email: string | null }[];
    const row = rows[0];
    return row
      ? {
          partner: { userId: row.user_id, name: row.name, email: row.email },
          refLookupFailed: false,
        }
      : { refLookupFailed: false };
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "partner_ref_lookup_failed",
        source,
        ref: refCode,
        errorType: error instanceof Error ? error.name : "unknown",
      }),
    );
    return { refLookupFailed: true };
  }
}
