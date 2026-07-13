CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_account_idx" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "leads_created_at_idx" ON "leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "loan_cases_created_at_idx" ON "loan_cases" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "partner_documents_partner_type_idx" ON "partner_documents" USING btree ("partner_id","doc_type");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_expires_at_idx" ON "session" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
ALTER TABLE "loan_cases" ADD CONSTRAINT "loan_cases_amounts_nonnegative" CHECK (("loan_cases"."requested_amount_paise" is null or "loan_cases"."requested_amount_paise" >= 0)
        and ("loan_cases"."sanctioned_amount_paise" is null or "loan_cases"."sanctioned_amount_paise" >= 0)
        and ("loan_cases"."disbursed_amount_paise" is null or "loan_cases"."disbursed_amount_paise" >= 0)
        and ("loan_cases"."revenue_paise" is null or "loan_cases"."revenue_paise" >= 0)
        and ("loan_cases"."payout_paise" is null or "loan_cases"."payout_paise" >= 0));--> statement-breakpoint
ALTER TABLE "partner_documents" ADD CONSTRAINT "partner_documents_size_positive" CHECK ("partner_documents"."size_bytes" > 0 and "partner_documents"."size_bytes" <= 5242880);--> statement-breakpoint
ALTER TABLE "partner_payouts" ADD CONSTRAINT "partner_payouts_amount_positive" CHECK ("partner_payouts"."amount_paise" > 0);