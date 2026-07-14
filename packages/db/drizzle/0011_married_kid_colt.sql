-- Partner reference IDs: BP<seq> (business) / RP<seq> (referral). The sequence
-- is created here and is not managed by Drizzle; the app reads nextval() at
-- signup (see apps/partners/lib/signup-actions.ts). Expand-safe: add nullable,
-- backfill existing rows, then enforce NOT NULL + UNIQUE.
CREATE SEQUENCE IF NOT EXISTS "partners_reference_seq" START WITH 100000;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "reference_id" text;--> statement-breakpoint
UPDATE "partners"
  SET "reference_id" = (CASE WHEN "type" = 'business' THEN 'BP' ELSE 'RP' END)
    || lpad(nextval('partners_reference_seq')::text, 6, '0')
  WHERE "reference_id" IS NULL;--> statement-breakpoint
ALTER TABLE "partners" ALTER COLUMN "reference_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "partners" ADD CONSTRAINT "partners_reference_id_unique" UNIQUE("reference_id");
