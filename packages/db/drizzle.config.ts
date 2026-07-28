import { defineConfig } from "drizzle-kit";
import { resolveSafeDatabaseUrl } from "./scripts/resolve-database-url";

// Migrations run from Node (not the Worker), so they need a direct connection.
// The Worker connects via the Cloudflare Hyperdrive binding instead.
const url = resolveSafeDatabaseUrl("drizzle-kit (see packages/db/.env.example)");

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
});
