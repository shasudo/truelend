import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Create one connection per request on Workers. Hyperdrive pools connections
// upstream, so keep `max` small; `fetch_types: false` skips an extra round-trip
// on connect. Close it after the response: ctx.waitUntil(db.$client.end()).
//
// Worker callers pass env.HYPERDRIVE.connectionString. Direct DATABASE_URL use
// is restricted to guarded local or protected-CI Node tooling.
export function createDb(connectionString: string) {
  const client = postgres(connectionString, { max: 5, fetch_types: false });
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDb>;

export async function ping(db: Database): Promise<void> {
  const nonce = crypto.randomUUID();
  const [row] = await db.$client<{ nonce: string }[]>`
    select ${nonce}::text as nonce, pg_backend_pid() as backend_pid, clock_timestamp() as checked_at
  `;
  if (row?.nonce !== nonce) throw new Error("Database freshness probe failed");
}

export interface PartnerRegistrationSchemaProbe {
  requiredColumnCount: string;
  referenceSequence: string | null;
}

export function assertPartnerRegistrationSchemaReady(
  probe: PartnerRegistrationSchemaProbe | undefined,
): void {
  if (probe?.requiredColumnCount !== "3" || !probe.referenceSequence) {
    throw new Error("Referral Partner registration schema is not ready");
  }
}

export interface AuditImmutabilityProbe {
  guardFunction: string | null;
  guardTrigger: string | null;
}

/*
 * The audit_log append-only guard is a trigger plus a plpgsql function, and
 * Drizzle models neither — they exist only in raw migration SQL. A push, branch
 * restore or snapshot rebuild recreates the table without them, which is how
 * production ended up with a freely mutable audit log despite the migration
 * being recorded as applied. Nothing else would have noticed, so readiness does.
 */
export function assertAuditImmutabilityReady(probe: AuditImmutabilityProbe | undefined): void {
  if (!probe?.guardFunction || !probe.guardTrigger) {
    throw new Error("audit_log append-only guard is missing");
  }
}

export async function pingAuditImmutability(db: Database): Promise<void> {
  const [probe] = await db.$client<AuditImmutabilityProbe[]>`
    select
      to_regproc(
        format('%I.%I', current_schema(), 'prevent_audit_log_mutation')
      )::text as "guardFunction",
      (
        select t.tgname
        from pg_trigger t
        join pg_class c on c.oid = t.tgrelid
        join pg_namespace n on n.oid = c.relnamespace
        where not t.tgisinternal
          and n.nspname = current_schema()
          and c.relname = 'audit_log'
          and t.tgname = 'audit_log_immutable'
          and t.tgenabled <> 'D'
      ) as "guardTrigger"
  `;
  assertAuditImmutabilityReady(probe);
}

export async function pingPartnerRegistrationSchema(db: Database): Promise<void> {
  const [probe] = await db.$client<PartnerRegistrationSchemaProbe[]>`
    select
      (
        select count(*)::text
        from information_schema.columns
        where table_schema = current_schema()
          and table_name = 'partners'
          and column_name in ('date_of_birth', 'city', 'referral_type')
      ) as "requiredColumnCount",
      to_regclass(
        format('%I.%I', current_schema(), 'partners_reference_seq')
      )::text as "referenceSequence"
  `;
  assertPartnerRegistrationSchemaReady(probe);
}
