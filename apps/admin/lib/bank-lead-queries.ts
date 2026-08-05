import "server-only";
import type { Database } from "@truelend/db";

type Row = Record<string, unknown>;

export interface BankLeadListRow {
  id: string;
  trackingCode: string;
  productSlug: string;
  phone: string;
  status: string;
  bankStatus: string | null;
  bankStage: string | null;
  bankApplicationId: string | null;
  createdAt: Date;
  partnerName: string | null;
  partnerReferenceId: string | null;
}

// ponytail: no pagination yet, capped at the most recent 500 rows. Add
// pagination (mirroring listCallTasks) once a real book of business outgrows
// a single page — every referral routes through here, so growth is steady,
// not spiky.
const LIST_LIMIT = 500;

export async function listBankLeads(db: Database, status?: string): Promise<BankLeadListRow[]> {
  const s = status ?? null;
  const rows = (await db.$client`
    select b.id, b.tracking_code, b.product_slug, b.phone, b.status,
      b.bank_status, b.bank_stage, b.bank_application_id, b.created_at,
      u.name as partner_name, p.reference_id as partner_reference_id
    from bank_apply_leads b
    left join partners p on p.user_id = b.partner_id
    left join "user" u on u.id = p.user_id
    where (${s}::text is null or b.status::text = ${s})
    order by b.created_at desc
    limit ${LIST_LIMIT}
  `) as Row[];
  return rows.map((r) => ({
    id: String(r.id),
    trackingCode: String(r.tracking_code),
    productSlug: String(r.product_slug),
    phone: String(r.phone),
    status: String(r.status),
    bankStatus: r.bank_status == null ? null : String(r.bank_status),
    bankStage: r.bank_stage == null ? null : String(r.bank_stage),
    bankApplicationId: r.bank_application_id == null ? null : String(r.bank_application_id),
    createdAt: new Date(String(r.created_at)),
    partnerName: r.partner_name == null ? null : String(r.partner_name),
    partnerReferenceId: r.partner_reference_id == null ? null : String(r.partner_reference_id),
  }));
}
