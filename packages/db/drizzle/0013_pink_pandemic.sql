ALTER TABLE "leads" DROP CONSTRAINT "leads_application_amounts_valid";--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "preferred_emi_paise" bigint;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "outstanding_loan_amount_paise" bigint;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "credit_card_outstanding_paise" bigint;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "existing_with_employer" text;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_application_amounts_valid" CHECK (("leads"."loan_amount_paise" is null or ("leads"."loan_amount_paise" >= 0 and "leads"."loan_amount_paise" <= 9007199254740991))
        and ("leads"."monthly_income_paise" is null or ("leads"."monthly_income_paise" >= 0 and "leads"."monthly_income_paise" <= 9007199254740991))
        and ("leads"."existing_emi_paise" is null or ("leads"."existing_emi_paise" >= 0 and "leads"."existing_emi_paise" <= 9007199254740991))
        and ("leads"."asset_value_paise" is null or ("leads"."asset_value_paise" >= 0 and "leads"."asset_value_paise" <= 9007199254740991))
        and ("leads"."annual_turnover_paise" is null or ("leads"."annual_turnover_paise" >= 0 and "leads"."annual_turnover_paise" <= 9007199254740991))
        and ("leads"."preferred_emi_paise" is null or ("leads"."preferred_emi_paise" >= 0 and "leads"."preferred_emi_paise" <= 9007199254740991))
        and ("leads"."outstanding_loan_amount_paise" is null or ("leads"."outstanding_loan_amount_paise" >= 0 and "leads"."outstanding_loan_amount_paise" <= 9007199254740991))
        and ("leads"."credit_card_outstanding_paise" is null or ("leads"."credit_card_outstanding_paise" >= 0 and "leads"."credit_card_outstanding_paise" <= 9007199254740991))
        and ("leads"."tenure_months" is null or ("leads"."tenure_months" >= 0 and "leads"."tenure_months" <= 600))
        and ("leads"."experience_years" is null or ("leads"."experience_years" >= 0 and "leads"."experience_years" <= 100)));