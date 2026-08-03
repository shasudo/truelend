import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import {
  schema,
  type Database,
  type Partner,
  type PartnerDocument,
  type PartnerPayout,
  type Lead,
} from "@truelend/db";
import { normalizeSafeInteger } from "@truelend/reference";
import { normalizePartnerLedger } from "./partner-ledger";

type Row = Record<string, unknown>;

interface PartnerListRow {
  userId: string;
  /** RP code partners share in their links — the only handle support is ever given. */
  referenceId: string;
  name: string;
  email: string;
  status: string;
  createdAt: Date;
  leadCount: number;
  docCount: number;
}

export async function listPartners(db: Database, status?: string): Promise<PartnerListRow[]> {
  const s = status ?? null;
  const rows = (await db.$client`
    select p.user_id, p.reference_id, p.status, p.created_at, u.name, u.email,
      (select count(*)::int from leads l where l.partner_id = p.user_id) as lead_count,
      (select count(*)::int from partner_documents d where d.partner_id = p.user_id) as doc_count
    from partners p join "user" u on u.id = p.user_id
    where (${s}::text is null or p.status::text = ${s})
    order by p.created_at desc
  `) as Row[];
  return rows.map((r) => ({
    userId: String(r.user_id),
    referenceId: String(r.reference_id),
    name: String(r.name),
    email: String(r.email),
    status: String(r.status),
    // Raw postgres.js (fetch_types:false) returns timestamptz as a string.
    createdAt: new Date(String(r.created_at)),
    leadCount: normalizeSafeInteger(r.lead_count, "Partner lead count"),
    docCount: normalizeSafeInteger(r.doc_count, "Partner document count"),
  }));
}

interface PartnerDetail {
  partner: Partner;
  name: string;
  email: string;
  documents: PartnerDocument[];
  payouts: PartnerPayout[];
  leads: Lead[];
  earnedPaise: number;
  paidPaise: number;
}

export async function getPartnerDetail(db: Database, id: string): Promise<PartnerDetail | null> {
  const rows = await db
    .select({ partner: schema.partners, name: schema.user.name, email: schema.user.email })
    .from(schema.partners)
    .innerJoin(schema.user, eq(schema.user.id, schema.partners.userId))
    .where(eq(schema.partners.userId, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  const [documents, payouts, leads, [ledger]] = await Promise.all([
    db
      .select()
      .from(schema.partnerDocuments)
      .where(eq(schema.partnerDocuments.partnerId, id))
      .orderBy(desc(schema.partnerDocuments.uploadedAt)),
    db
      .select()
      .from(schema.partnerPayouts)
      .where(eq(schema.partnerPayouts.partnerId, id))
      .orderBy(desc(schema.partnerPayouts.createdAt)),
    db
      .select()
      .from(schema.leads)
      .where(eq(schema.leads.partnerId, id))
      .orderBy(desc(schema.leads.createdAt))
      .limit(10),
    db
      .select({
        earned: sql<string>`coalesce(sum(${schema.partnerPayouts.amountPaise}) filter (where ${schema.partnerPayouts.kind} = 'earned'), 0)`,
        paid: sql<string>`coalesce(sum(${schema.partnerPayouts.amountPaise}) filter (where ${schema.partnerPayouts.kind} = 'paid'), 0)`,
      })
      .from(schema.partnerPayouts)
      .where(eq(schema.partnerPayouts.partnerId, id)),
  ]);

  const ledgerTotals = normalizePartnerLedger(ledger?.earned, ledger?.paid);
  return {
    partner: row.partner,
    name: row.name,
    email: row.email,
    documents,
    payouts,
    leads,
    earnedPaise: ledgerTotals.earnedPaise,
    paidPaise: ledgerTotals.paidPaise,
  };
}
