ALTER TABLE "loan_cases" DROP CONSTRAINT "loan_cases_amounts_nonnegative";--> statement-breakpoint
UPDATE "leads"
SET
	"consent_at" = coalesce("consent_at", "created_at"),
	"consent_source" = coalesce("consent_source", 'legacy'),
	"consent_version" = coalesce("consent_version", 'pre-2026-07-13')
WHERE "consent" = true
	AND ("consent_at" is null OR "consent_source" is null OR "consent_version" is null);--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_required_fields" CHECK (("leads"."kind" = 'enquiry' and "leads"."name" is not null and "leads"."phone" is not null)
        or ("leads"."kind" = 'referral' and "leads"."name" is not null and "leads"."phone" is not null and "leads"."referrer_name" is not null and "leads"."referrer_phone" is not null)
        or ("leads"."kind" = 'contact' and "leads"."name" is not null and "leads"."phone" is not null and "leads"."message" is not null)
        or ("leads"."kind" = 'cibil_notify' and "leads"."email" is not null));--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_consent_proof" CHECK ("leads"."consent" = false or ("leads"."consent_at" is not null and "leads"."consent_source" is not null and "leads"."consent_version" is not null));--> statement-breakpoint
ALTER TABLE "loan_cases" ADD CONSTRAINT "loan_cases_amounts_nonnegative" CHECK (("loan_cases"."requested_amount_paise" is null or "loan_cases"."requested_amount_paise" >= 0)
        and ("loan_cases"."sanctioned_amount_paise" is null or "loan_cases"."sanctioned_amount_paise" >= 0)
        and ("loan_cases"."disbursed_amount_paise" is null or "loan_cases"."disbursed_amount_paise" >= 0)
        and ("loan_cases"."revenue_paise" is null or "loan_cases"."revenue_paise" >= 0)
        and ("loan_cases"."payout_paise" is null or "loan_cases"."payout_paise" >= 0)
        and ("loan_cases"."requested_amount_paise" is null or "loan_cases"."requested_amount_paise" <= 9007199254740991)
        and ("loan_cases"."sanctioned_amount_paise" is null or "loan_cases"."sanctioned_amount_paise" <= 9007199254740991)
        and ("loan_cases"."disbursed_amount_paise" is null or "loan_cases"."disbursed_amount_paise" <= 9007199254740991)
        and ("loan_cases"."revenue_paise" is null or "loan_cases"."revenue_paise" <= 9007199254740991)
        and ("loan_cases"."payout_paise" is null or "loan_cases"."payout_paise" <= 9007199254740991));--> statement-breakpoint
ALTER TABLE "partner_documents" ADD CONSTRAINT "partner_documents_storage_valid" CHECK ("partner_documents"."r2_key" like 'kyc/%' and "partner_documents"."content_type" in ('image/jpeg', 'image/png', 'application/pdf'));--> statement-breakpoint
ALTER TABLE "partners" ADD CONSTRAINT "partners_review_state_valid" CHECK (("partners"."status" <> 'verified' or ("partners"."verified_by" is not null and "partners"."verified_at" is not null))
        and ("partners"."status" <> 'rejected' or ("partners"."rejection_reason" is not null and length(trim("partners"."rejection_reason")) > 0)));--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_role_valid" CHECK ("user"."role" is null or "user"."role" in ('admin', 'employee', 'business', 'referral', 'partner_pending'));
