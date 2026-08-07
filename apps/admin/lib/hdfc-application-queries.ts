import "server-only";
import type { Database } from "@truelend/db";

type Row = Record<string, unknown>;

export interface HdfcApplicationListRow {
  id: string;
  applicationReferenceNumber: string;
  customerName: string | null;
  city: string | null;
  state: string | null;
  currentStage: string | null;
  finalDecision: string | null;
  creationDateTime: string | null;
  dsaCode: string | null;
  importedAt: Date;
}

// ponytail: no pagination yet, capped at the most recent 500 rows — mirrors
// listBankLeads's LIST_LIMIT for the same reason.
const LIST_LIMIT = 500;

export async function listHdfcApplications(db: Database): Promise<HdfcApplicationListRow[]> {
  const rows = (await db.$client`
    select id, application_reference_number, customer_name, city, state,
      current_stage, final_decision, creation_date_time, dsa_code, imported_at
    from hdfc_applications
    order by imported_at desc
    limit ${LIST_LIMIT}
  `) as Row[];
  return rows.map((r) => ({
    id: String(r.id),
    applicationReferenceNumber: String(r.application_reference_number),
    customerName: r.customer_name == null ? null : String(r.customer_name),
    city: r.city == null ? null : String(r.city),
    state: r.state == null ? null : String(r.state),
    currentStage: r.current_stage == null ? null : String(r.current_stage),
    finalDecision: r.final_decision == null ? null : String(r.final_decision),
    creationDateTime: r.creation_date_time == null ? null : String(r.creation_date_time),
    dsaCode: r.dsa_code == null ? null : String(r.dsa_code),
    importedAt: new Date(String(r.imported_at)),
  }));
}
