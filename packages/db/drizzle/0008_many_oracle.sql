ALTER TABLE "partners" DROP CONSTRAINT "partners_review_state_valid";--> statement-breakpoint
ALTER TABLE "partners" ADD CONSTRAINT "partners_review_state_valid" CHECK (("partners"."status" <> 'verified' or (
          "partners"."verified_by" is not null
          and "partners"."verified_at" is not null
          and "partners"."submitted_at" is not null
          and "partners"."rejection_reason" is null
          and "partners"."pan" is not null and length(trim("partners"."pan")) > 0
          and "partners"."address" is not null and length(trim("partners"."address")) > 0
          and "partners"."account_holder" is not null and length(trim("partners"."account_holder")) > 0
          and "partners"."account_number" is not null and length(trim("partners"."account_number")) > 0
          and "partners"."ifsc" is not null and length(trim("partners"."ifsc")) > 0
        ))
        and ("partners"."status" <> 'rejected' or (
          "partners"."verified_by" is not null
          and "partners"."verified_at" is not null
          and "partners"."rejection_reason" is not null
          and length(trim("partners"."rejection_reason")) > 0
        )));
