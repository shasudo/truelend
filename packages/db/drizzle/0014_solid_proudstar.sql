ALTER TABLE "user" DROP CONSTRAINT "user_role_valid";--> statement-breakpoint
ALTER TABLE "partner_documents" ALTER COLUMN "doc_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."partner_doc_type";--> statement-breakpoint
CREATE TYPE "public"."partner_doc_type" AS ENUM('pan', 'aadhaar', 'photo', 'cheque');--> statement-breakpoint
ALTER TABLE "partner_documents" ALTER COLUMN "doc_type" SET DATA TYPE "public"."partner_doc_type" USING "doc_type"::"public"."partner_doc_type";--> statement-breakpoint
ALTER TABLE "partners" DROP COLUMN "type";--> statement-breakpoint
ALTER TABLE "partners" DROP COLUMN "alternate_phone";--> statement-breakpoint
ALTER TABLE "partners" DROP COLUMN "business_name";--> statement-breakpoint
ALTER TABLE "partners" DROP COLUMN "gst";--> statement-breakpoint
ALTER TABLE "partners" DROP COLUMN "products_handled";--> statement-breakpoint
ALTER TABLE "partners" DROP COLUMN "years_experience";--> statement-breakpoint
ALTER TABLE "partners" DROP COLUMN "monthly_volume_loans_paise";--> statement-breakpoint
ALTER TABLE "partners" DROP COLUMN "monthly_volume_insurance_paise";--> statement-breakpoint
ALTER TABLE "partners" DROP COLUMN "monthly_volume_mutual_funds_paise";--> statement-breakpoint
ALTER TABLE "partners" DROP COLUMN "residence_address";--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_role_valid" CHECK ("user"."role" is null or "user"."role" in ('admin', 'employee', 'referral', 'partner_pending'));--> statement-breakpoint
DROP TYPE "public"."partner_type";