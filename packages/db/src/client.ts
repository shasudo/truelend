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
