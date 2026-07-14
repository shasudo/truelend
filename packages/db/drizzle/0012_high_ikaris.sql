CREATE TYPE "public"."employment_type" AS ENUM('salaried', 'self_employed_professional', 'self_employed_business');--> statement-breakpoint
CREATE TYPE "public"."residence_type" AS ENUM('owned', 'rented', 'family', 'company');--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "loan_amount_paise" bigint;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "tenure_months" integer;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "loan_purpose" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "pincode" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "residence_type" "residence_type";--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "employment_type" "employment_type";--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "monthly_income_paise" bigint;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "employer_name" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "experience_years" integer;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "existing_emi_paise" bigint;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "asset_value_paise" bigint;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "annual_turnover_paise" bigint;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_application_amounts_valid" CHECK (("leads"."loan_amount_paise" is null or ("leads"."loan_amount_paise" >= 0 and "leads"."loan_amount_paise" <= 9007199254740991))
        and ("leads"."monthly_income_paise" is null or ("leads"."monthly_income_paise" >= 0 and "leads"."monthly_income_paise" <= 9007199254740991))
        and ("leads"."existing_emi_paise" is null or ("leads"."existing_emi_paise" >= 0 and "leads"."existing_emi_paise" <= 9007199254740991))
        and ("leads"."asset_value_paise" is null or ("leads"."asset_value_paise" >= 0 and "leads"."asset_value_paise" <= 9007199254740991))
        and ("leads"."annual_turnover_paise" is null or ("leads"."annual_turnover_paise" >= 0 and "leads"."annual_turnover_paise" <= 9007199254740991))
        and ("leads"."tenure_months" is null or ("leads"."tenure_months" >= 0 and "leads"."tenure_months" <= 600))
        and ("leads"."experience_years" is null or ("leads"."experience_years" >= 0 and "leads"."experience_years" <= 100)));