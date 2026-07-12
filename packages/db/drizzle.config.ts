import { defineConfig } from "drizzle-kit";

// Migrations run from Node (not the Worker), so they need a direct connection.
// The Worker connects via the Cloudflare Hyperdrive binding instead.
try {
  // ponytail: Node 20.12+ built-in — no dotenv dependency.
  process.loadEnvFile(".env");
} catch {
  // No .env file — fall back to an ambient DATABASE_URL.
}

const url = process.env.DATABASE_URL;
if (!url)
  throw new Error("DATABASE_URL is required for drizzle-kit (see packages/db/.env.example)");

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
});
