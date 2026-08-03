CREATE TYPE "public"."call_status" AS ENUM('new', 'attempted', 'callback_scheduled', 'interested', 'not_interested', 'wrong_number', 'converted');--> statement-breakpoint
CREATE TABLE "call_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"city" text,
	"product_slug" text,
	"source" text,
	"notes" text,
	"status" "call_status" DEFAULT 'new' NOT NULL,
	"callback_at" timestamp with time zone,
	"assigned_to" text,
	"lead_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "call_tasks_callback_time" CHECK ("call_tasks"."status" <> 'callback_scheduled' or "call_tasks"."callback_at" is not null),
	CONSTRAINT "call_tasks_converted_has_lead" CHECK ("call_tasks"."status" <> 'converted' or "call_tasks"."lead_id" is not null)
);
--> statement-breakpoint
ALTER TABLE "call_tasks" ADD CONSTRAINT "call_tasks_assigned_to_user_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_tasks" ADD CONSTRAINT "call_tasks_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "call_tasks_assigned_to_idx" ON "call_tasks" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "call_tasks_status_idx" ON "call_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "call_tasks_phone_idx" ON "call_tasks" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "call_tasks_created_at_idx" ON "call_tasks" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "leads_phone_idx" ON "leads" USING btree ("phone");