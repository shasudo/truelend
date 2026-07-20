import { defineConfig } from "drizzle-kit";
import { assertSafeDatabaseTarget } from "./scripts/database-target";
import { loadLocalDatabaseEnv } from "./scripts/load-local-env";

// Migrations run from Node (not the Worker), so they need a direct connection.
// The Worker connects via the Cloudflare Hyperdrive binding instead.
loadLocalDatabaseEnv();

const url = process.env.DATABASE_URL;
if (!url)
  throw new Error("DATABASE_URL is required for drizzle-kit (see packages/db/.env.example)");
assertSafeDatabaseTarget(url);

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
});
