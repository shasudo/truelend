import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  schema,
  type Database,
  type Partner,
  type PartnerDocument,
  type PartnerPayout,
  type Lead,
} from "@truelend/db";

const num = (v: unknown) => Number(v ?? 0);
type Row = Record<string, unknown>;

export interface PartnerListRow {
  userId: string;
  name: string;
  email: string;
  type: string;
  status: string;
  businessName: string | null;
  createdAt: Date;
  leadCount: number;
  docCount: number;
}

export async function listPartners(db: Database, status?: string): Promise<PartnerListRow[]> {
  const client = db.$client;
  const rows = (await client`
    select p.user_id, p.type, p.status, p.business_name, p.created_at, u.name, u.email,
      (select count(*)::int from leads l where l.partner_id = p.user_id) as lead_count,
      (select count(*)::int from partner_documents d where d.partner_id = p.user_id) as doc_count
    from partners p join "user" u on u.id = p.user_id
    ${status ? client`where p.status = ${status}` : client``}
    order by p.created_at desc
  `) as Row[];
  return rows.map((r) => ({
    userId: String(r.user_id),
    name: String(r.name),
    email: String(r.email),
    type: String(r.type),
    status: String(r.status),
    businessName: (r.business_name as string | null) ?? null,
    createdAt: r.created_at as Date,
    leadCount: num(r.lead_count),
    docCount: num(r.doc_count),
  }));
}

export interface PartnerDetail {
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

  const [documents, payouts, leads] = await Promise.all([
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
  ]);

  const earnedRows = await db
    .select({ total: sql<string>`coalesce(sum(${schema.partnerPayouts.amountPaise}), 0)` })
    .from(schema.partnerPayouts)
    .where(and(eq(schema.partnerPayouts.partnerId, id), eq(schema.partnerPayouts.kind, "earned")));
  const paidRows = await db
    .select({ total: sql<string>`coalesce(sum(${schema.partnerPayouts.amountPaise}), 0)` })
    .from(schema.partnerPayouts)
    .where(and(eq(schema.partnerPayouts.partnerId, id), eq(schema.partnerPayouts.kind, "paid")));

  return {
    partner: row.partner,
    name: row.name,
    email: row.email,
    documents,
    payouts,
    leads,
    earnedPaise: num(earnedRows[0]?.total),
    paidPaise: num(paidRows[0]?.total),
  };
}
