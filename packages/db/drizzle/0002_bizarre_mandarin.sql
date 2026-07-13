CREATE TYPE "public"."partner_doc_type" AS ENUM('pan', 'aadhaar', 'photo', 'cheque', 'gst');--> statement-breakpoint
CREATE TYPE "public"."partner_status" AS ENUM('pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."partner_type" AS ENUM('business', 'referral');--> statement-breakpoint
CREATE TYPE "public"."payout_kind" AS ENUM('earned', 'paid');--> statement-breakpoint
CREATE TABLE "partner_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" text NOT NULL,
	"doc_type" "partner_doc_type" NOT NULL,
	"r2_key" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" text NOT NULL,
	"loan_case_id" uuid,
	"amount_paise" bigint NOT NULL,
	"kind" "payout_kind" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partners" (
	"user_id" text PRIMARY KEY NOT NULL,
	"type" "partner_type" NOT NULL,
	"status" "partner_status" DEFAULT 'pending' NOT NULL,
	"phone" text,
	"business_name" text,
	"pan" text,
	"gst" text,
	"verified_by" text,
	"verified_at" timestamp with time zone,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "partner_id" text;--> statement-breakpoint
ALTER TABLE "partner_documents" ADD CONSTRAINT "partner_documents_partner_id_partners_user_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_payouts" ADD CONSTRAINT "partner_payouts_partner_id_partners_user_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_payouts" ADD CONSTRAINT "partner_payouts_loan_case_id_loan_cases_id_fk" FOREIGN KEY ("loan_case_id") REFERENCES "public"."loan_cases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partners" ADD CONSTRAINT "partners_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partners" ADD CONSTRAINT "partners_verified_by_user_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "partner_documents_partner_id_idx" ON "partner_documents" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "partner_payouts_partner_id_idx" ON "partner_payouts" USING btree ("partner_id");--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_partner_id_partners_user_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "leads_partner_id_idx" ON "leads" USING btree ("partner_id");