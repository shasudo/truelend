ALTER TYPE "public"."call_status" ADD VALUE 'busy' BEFORE 'callback_scheduled';--> statement-breakpoint
ALTER TYPE "public"."call_status" ADD VALUE 'interested_card' BEFORE 'not_interested';--> statement-breakpoint
ALTER TYPE "public"."call_status" ADD VALUE 'interested_both' BEFORE 'not_interested';--> statement-breakpoint
ALTER TYPE "public"."call_status" ADD VALUE 'already_has_product' BEFORE 'wrong_number';--> statement-breakpoint
ALTER TYPE "public"."call_status" ADD VALUE 'do_not_contact' BEFORE 'converted';--> statement-breakpoint
ALTER TYPE "public"."call_status" ADD VALUE 'exhausted';