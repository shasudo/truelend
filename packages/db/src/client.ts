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
