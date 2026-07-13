import postgres from "postgres";

try {
  process.loadEnvFile(".env");
} catch {
  // CI provides DATABASE_URL directly; local runs may use packages/db/.env.
}

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required for the migration preflight");

const sql = postgres(url, { max: 1, prepare: false });

try {
  // Counts only: this deliberately never prints customer or KYC values.
  const [result] = await sql<
    Array<{
      invalidRoles: string;
      duplicateAccounts: string;
      duplicatePartnerDocuments: string;
      invalidLeadShapes: string;
      invalidLoanAmounts: string;
      invalidPartnerDocuments: string;
      invalidPayouts: string;
      invalidPartnerReviews: string;
    }>
  >`
    select
      (select count(*) from "user"
        where role is not null
          and role not in ('admin', 'employee', 'business', 'referral', 'partner_pending'))
        as "invalidRoles",
      (select count(*) from (
        select provider_id, account_id from account
        group by provider_id, account_id having count(*) > 1
      ) duplicates) as "duplicateAccounts",
      (select count(*) from (
        select partner_id, doc_type from partner_documents
        group by partner_id, doc_type having count(*) > 1
      ) duplicates) as "duplicatePartnerDocuments",
      (select count(*) from leads where not (
        (kind = 'enquiry' and name is not null and phone is not null)
        or (kind = 'referral' and name is not null and phone is not null
          and referrer_name is not null and referrer_phone is not null)
        or (kind = 'contact' and name is not null and phone is not null and message is not null)
        or (kind = 'cibil_notify' and email is not null)
      )) as "invalidLeadShapes",
      (select count(*) from loan_cases where
        (requested_amount_paise is not null
          and (requested_amount_paise < 0 or requested_amount_paise > 9007199254740991))
        or (sanctioned_amount_paise is not null
          and (sanctioned_amount_paise < 0 or sanctioned_amount_paise > 9007199254740991))
        or (disbursed_amount_paise is not null
          and (disbursed_amount_paise < 0 or disbursed_amount_paise > 9007199254740991))
        or (revenue_paise is not null
          and (revenue_paise < 0 or revenue_paise > 9007199254740991))
        or (payout_paise is not null
          and (payout_paise < 0 or payout_paise > 9007199254740991))
      ) as "invalidLoanAmounts",
      (select count(*) from partner_documents where
        size_bytes <= 0 or size_bytes > 5242880 or r2_key not like 'kyc/%'
        or content_type not in ('image/jpeg', 'image/png', 'application/pdf')
      ) as "invalidPartnerDocuments",
      (select count(*) from partner_payouts where amount_paise <= 0) as "invalidPayouts",
      (select count(*) from partners where
        (status = 'verified' and (
          verified_by is null or verified_at is null or submitted_at is null
          or rejection_reason is not null
          or coalesce(length(trim(pan)), 0) = 0
          or coalesce(length(trim(address)), 0) = 0
          or coalesce(length(trim(account_holder)), 0) = 0
          or coalesce(length(trim(account_number)), 0) = 0
          or coalesce(length(trim(ifsc)), 0) = 0
        ))
        or (status = 'rejected' and (
          verified_by is null or verified_at is null
          or coalesce(length(trim(rejection_reason)), 0) = 0
        ))
      ) as "invalidPartnerReviews"
  `;

  if (!result) throw new Error("Migration preflight returned no result");
  const failures = Object.entries(result)
    .map(([name, count]) => [name, Number(count)] as const)
    .filter(([, count]) => count > 0);

  if (failures.length > 0) {
    console.error("Migration preflight failed; clean these row counts before migrating:");
    for (const [name, count] of failures) console.error(`- ${name}: ${count}`);
    process.exitCode = 1;
  } else {
    console.log("Migration preflight passed: no rows violate the new constraints.");
  }
} finally {
  await sql.end();
}
