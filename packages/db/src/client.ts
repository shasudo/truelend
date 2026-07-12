import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "./schema";

// Create one connection per request on Workers. Hyperdrive pools connections
// upstream, so keep `max` small; `fetch_types: false` skips an extra round-trip
// on connect. Close it after the response: ctx.waitUntil(db.$client.end()).
//
// Pass env.HYPERDRIVE.connectionString in the Worker; a direct DATABASE_URL
// works too (e.g. local dev, scripts).
export function createDb(connectionString: string) {
  const client = postgres(connectionString, { max: 5, fetch_types: false });
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDb>;

// Liveness probe — throws if the database is unreachable.
export async function ping(db: Database): Promise<void> {
  await db.execute(sql`select 1`);
}
