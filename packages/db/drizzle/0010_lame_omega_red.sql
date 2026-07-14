ALTER TABLE "partners" ADD COLUMN "alternate_phone" text;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "products_handled" jsonb;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "years_experience" integer;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "monthly_volume_loans_paise" bigint;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "monthly_volume_insurance_paise" bigint;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "monthly_volume_mutual_funds_paise" bigint;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "occupation" text;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "designation" text;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "experience_note" text;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "residence_address" text;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "bank_name" text;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "bank_branch" text;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "nominee_name" text;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "nominee_aadhaar" text;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "nominee_phone" text;