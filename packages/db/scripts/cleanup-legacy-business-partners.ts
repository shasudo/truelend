import postgres from "postgres";
import { assertSafeDatabaseTarget } from "./database-target";
import { requireLegacyBusinessCleanupApproval } from "./legacy-business-cleanup-policy";
import { loadLocalDatabaseEnv } from "./load-local-env";

// CI provides DATABASE_URL directly; local runs may use packages/db/.env.
loadLocalDatabaseEnv();

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required for legacy Business Partner cleanup");
assertSafeDatabaseTarget(url);

requireLegacyBusinessCleanupApproval(process.env.TRUELEND_LEGACY_BUSINESS_CLEANUP_APPROVED);

const sql = postgres(url, { max: 1, prepare: false });

try {
  const [legacyShape] = await sql<Array<{ hasPartnerType: boolean }>>`
    select exists (
      select 1
      from information_schema.columns
      where table_schema = current_schema()
        and table_name = 'partners'
        and column_name = 'type'
    ) as "hasPartnerType"
  `;
  if (!legacyShape) throw new Error("Legacy Business Partner cleanup could not inspect the schema");

  await sql.begin(async (tx) => {
    await tx`
      create temporary table legacy_business_user_ids (
        id text primary key
      ) on commit drop
    `;

    await tx`
      insert into legacy_business_user_ids (id)
      select id
      from "user"
      where role = 'business'
      on conflict do nothing
    `;

    if (legacyShape.hasPartnerType) {
      const [unsafeBusinessProfiles] = await tx<Array<{ count: number }>>`
        select count(*)::integer as count
        from partners p
        join "user" u on u.id = p.user_id
        where p.type::text = 'business'
          and (u.role is null or u.role not in ('business', 'partner_pending'))
      `;
      if (!unsafeBusinessProfiles) {
        throw new Error("Legacy Business Partner cleanup returned no profile safety count");
      }
      if (unsafeBusinessProfiles.count > 0) {
        throw new Error(
          `Legacy Business Partner cleanup found ${unsafeBusinessProfiles.count} Business Partner profiles linked to unexpected roles; no rows were deleted`,
        );
      }

      await tx`
        insert into legacy_business_user_ids (id)
        select user_id
        from partners
        where type::text = 'business'
        on conflict do nothing
      `;
    }

    const businessUsers = await tx<Array<{ id: string }>>`
      select u.id
      from "user" u
      join legacy_business_user_ids legacy on legacy.id = u.id
      for update
    `;

    const deletedStandaloneGstDocuments = legacyShape.hasPartnerType
      ? await tx<Array<{ id: string }>>`
          delete from partner_documents
          where doc_type::text = 'gst'
            and partner_id not in (select id from legacy_business_user_ids)
          returning id
        `
      : [];

    if (businessUsers.length === 0 && deletedStandaloneGstDocuments.length === 0) {
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
          where user_id in (select id from legacy_business_user_ids)) as accounts,
        (select count(*) from session
          where user_id in (select id from legacy_business_user_ids)) as sessions,
        (select count(*) from partners
          where user_id in (select id from legacy_business_user_ids)) as profiles,
        (select count(*) from partner_documents
          where partner_id in (select id from legacy_business_user_ids)) as documents,
        (select count(*) from partner_payouts
          where partner_id in (select id from legacy_business_user_ids)) as payouts
    `;
    if (!dependentCounts) throw new Error("Legacy Business Partner cleanup returned no row counts");

    const deletedLeadNotes = await tx<Array<{ id: string }>>`
      delete from lead_notes
      where author_id in (select id from legacy_business_user_ids)
      returning id
    `;
    const deletedLoanCases = await tx<Array<{ id: string }>>`
      delete from loan_cases
      where created_by in (select id from legacy_business_user_ids)
      returning id
    `;
    const deletedLeads = await tx<Array<{ id: string }>>`
      delete from leads
      where partner_id in (select id from legacy_business_user_ids)
      returning id
    `;
    const deletedVerifications = await tx<Array<{ id: string }>>`
      delete from verification
      where lower(identifier) in (
        select lower(u.email)
        from "user" u
        join legacy_business_user_ids legacy on legacy.id = u.id
      )
      returning id
    `;
    const deletedUsers = await tx<Array<{ id: string }>>`
      delete from "user"
      where id in (select id from legacy_business_user_ids)
      returning id
    `;

    if (deletedUsers.length !== businessUsers.length) {
      throw new Error(
        `Legacy Business Partner cleanup selected ${businessUsers.length} users but deleted ${deletedUsers.length}`,
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
          'standaloneGstDocuments', ${deletedStandaloneGstDocuments.length}::integer,
          'payouts', ${Number(dependentCounts.payouts)}::integer,
          'leads', ${deletedLeads.length}::integer,
          'loanCases', ${deletedLoanCases.length}::integer,
          'leadNotes', ${deletedLeadNotes.length}::integer,
          'verifications', ${deletedVerifications.length}::integer
        )
      )
    `;

    console.log(
      `Removed ${deletedUsers.length} legacy Business Partner users and ${deletedStandaloneGstDocuments.length} standalone GST document records.`,
    );
  });
} finally {
  await sql.end();
}
