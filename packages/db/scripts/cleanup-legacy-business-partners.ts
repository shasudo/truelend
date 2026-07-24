import postgres from "postgres";
import { assertSafeDatabaseTarget } from "./database-target";
import {
  requireLegacyBusinessCleanupApproval,
  shouldDeleteLegacyBusinessUsers,
} from "./legacy-business-cleanup-policy";
import { loadLocalDatabaseEnv } from "./load-local-env";

// CI provides DATABASE_URL directly; local runs may use packages/db/.env.
loadLocalDatabaseEnv();

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required for legacy Business Partner cleanup");
assertSafeDatabaseTarget(url);

const expectedUsers = requireLegacyBusinessCleanupApproval({
  approved: process.env.TRUELEND_LEGACY_BUSINESS_CLEANUP_APPROVED,
  expectedUsers: process.env.TRUELEND_EXPECTED_LEGACY_BUSINESS_USERS,
});

const sql = postgres(url, { max: 1, prepare: false });

try {
  await sql.begin(async (tx) => {
    const businessUsers = await tx<Array<{ id: string }>>`
      select id
      from "user"
      where role = 'business'
      for update
    `;

    if (!shouldDeleteLegacyBusinessUsers(businessUsers.length, expectedUsers)) {
      console.log("Legacy Business Partner cleanup is already complete.");
      return;
    }

    const [dependentCounts] = await tx<
      Array<{
        accounts: string;
        sessions: string;
        profiles: string;
        documents: string;
        payouts: string;
      }>
    >`
      select
        (select count(*) from account
          where user_id in (select id from "user" where role = 'business')) as accounts,
        (select count(*) from session
          where user_id in (select id from "user" where role = 'business')) as sessions,
        (select count(*) from partners
          where user_id in (select id from "user" where role = 'business')) as profiles,
        (select count(*) from partner_documents
          where partner_id in (select id from "user" where role = 'business')) as documents,
        (select count(*) from partner_payouts
          where partner_id in (select id from "user" where role = 'business')) as payouts
    `;
    if (!dependentCounts) throw new Error("Legacy Business Partner cleanup returned no row counts");

    const deletedLeadNotes = await tx<Array<{ id: string }>>`
      delete from lead_notes
      where author_id in (select id from "user" where role = 'business')
      returning id
    `;
    const deletedLoanCases = await tx<Array<{ id: string }>>`
      delete from loan_cases
      where created_by in (select id from "user" where role = 'business')
      returning id
    `;
    const deletedLeads = await tx<Array<{ id: string }>>`
      delete from leads
      where partner_id in (select id from "user" where role = 'business')
      returning id
    `;
    const deletedVerifications = await tx<Array<{ id: string }>>`
      delete from verification
      where lower(identifier) in (
        select lower(email) from "user" where role = 'business'
      )
      returning id
    `;
    const deletedUsers = await tx<Array<{ id: string }>>`
      delete from "user"
      where role = 'business'
      returning id
    `;

    if (deletedUsers.length !== expectedUsers) {
      throw new Error(
        `Legacy Business Partner cleanup deleted ${deletedUsers.length} users instead of ${expectedUsers}`,
      );
    }

    await tx`
      insert into audit_log (action, entity_type, after)
      values (
        'system.cleanup_legacy_business_partners',
        'legacy_business_partner',
        jsonb_build_object(
          'users', ${deletedUsers.length}::integer,
          'accounts', ${Number(dependentCounts.accounts)}::integer,
          'sessions', ${Number(dependentCounts.sessions)}::integer,
          'profiles', ${Number(dependentCounts.profiles)}::integer,
          'documents', ${Number(dependentCounts.documents)}::integer,
          'payouts', ${Number(dependentCounts.payouts)}::integer,
          'leads', ${deletedLeads.length}::integer,
          'loanCases', ${deletedLoanCases.length}::integer,
          'leadNotes', ${deletedLeadNotes.length}::integer,
          'verifications', ${deletedVerifications.length}::integer
        )
      )
    `;

    console.log(
      `Removed ${deletedUsers.length} legacy Business Partner users and their database-owned records.`,
    );
  });
} finally {
  await sql.end();
}
