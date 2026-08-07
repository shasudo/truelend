CREATE TABLE "hdfc_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_reference_number" text NOT NULL,
	"customer_name" text,
	"city" text,
	"state" text,
	"current_stage" text,
	"final_decision" text,
	"creation_date_time" text,
	"dsa_code" text,
	"raw" jsonb,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hdfc_applications_application_reference_number_unique" UNIQUE("application_reference_number")
);
--> statement-breakpoint
CREATE INDEX "hdfc_applications_current_stage_idx" ON "hdfc_applications" USING btree ("current_stage");--> statement-breakpoint
CREATE INDEX "hdfc_applications_imported_at_idx" ON "hdfc_applications" USING btree ("imported_at");