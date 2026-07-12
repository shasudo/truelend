CREATE TYPE "public"."lead_kind" AS ENUM('enquiry', 'referral', 'contact', 'cibil_notify');--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "lead_kind" NOT NULL,
	"name" text,
	"phone" text,
	"email" text,
	"city" text,
	"product_slug" text,
	"message" text,
	"referrer_name" text,
	"referrer_phone" text,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"consent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
