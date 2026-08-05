CREATE TYPE "public"."bank_apply_lead_status" AS ENUM('sent', 'in_progress', 'approved', 'rejected', 'card_issued');--> statement-breakpoint
CREATE TABLE "bank_apply_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tracking_code" text NOT NULL,
	"product_slug" text NOT NULL,
	"partner_id" text,
	"phone" text NOT NULL,
	"consent" boolean DEFAULT false NOT NULL,
	"consent_at" timestamp with time zone,
	"consent_source" text,
	"consent_version" text,
	"status" "bank_apply_lead_status" DEFAULT 'sent' NOT NULL,
	"bank_application_id" text,
	"bank_status" text,
	"bank_sub_status" text,
	"bank_stage" text,
	"bank_workflow_status" text,
	"card_issual_date" date,
	"bank_raw" jsonb,
	"bank_status_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bank_apply_leads_tracking_code_unique" UNIQUE("tracking_code"),
	CONSTRAINT "bank_apply_leads_consent_proof" CHECK ("bank_apply_leads"."consent" = false or ("bank_apply_leads"."consent_at" is not null and "bank_apply_leads"."consent_source" is not null and "bank_apply_leads"."consent_version" is not null))
);
--> statement-breakpoint
ALTER TABLE "bank_apply_leads" ADD CONSTRAINT "bank_apply_leads_partner_id_partners_user_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bank_apply_leads_partner_id_idx" ON "bank_apply_leads" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "bank_apply_leads_phone_idx" ON "bank_apply_leads" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "bank_apply_leads_status_idx" ON "bank_apply_leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bank_apply_leads_created_at_idx" ON "bank_apply_leads" USING btree ("created_at");