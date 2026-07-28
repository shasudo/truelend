import { assertSafeDatabaseTarget } from "./database-target";
import { loadLocalDatabaseEnv } from "./load-local-env";

export function resolveSafeDatabaseUrl(context: string): string {
  loadLocalDatabaseEnv();
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error(`DATABASE_URL is required for ${context}`);
  assertSafeDatabaseTarget(url);
  return url;
}
