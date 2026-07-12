import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

// ponytail: one demo table to prove the wiring end-to-end. Replace with the
// real schema (loans, borrowers, …) and run `pnpm db:generate` to make a migration.
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
