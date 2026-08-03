-- Restores the audit_log append-only guard.
--
-- 0005 created prevent_audit_log_mutation() and the audit_log_immutable trigger,
-- and the journal records 0005 as applied — but neither object existed in
-- production. Drizzle does not model triggers or functions in schema.ts, so they
-- live only in raw migration SQL: any `drizzle-kit push`, branch restore or
-- snapshot-based rebuild recreates the tables and silently drops both. The
-- append-only guarantee the schema comment claims was therefore not enforced,
-- and audit rows were freely deletable.
--
-- Written idempotently so it is safe to re-run and so a rebuild can replay it
-- without erroring. pingAuditImmutability() in packages/db/src/client.ts now
-- fails readiness if these objects go missing again, which is how it gets
-- noticed rather than discovered by accident.
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation() RETURNS trigger AS $$
BEGIN
	RAISE EXCEPTION 'audit_log is append-only';
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
DROP TRIGGER IF EXISTS audit_log_immutable ON "audit_log";--> statement-breakpoint
CREATE TRIGGER audit_log_immutable
	BEFORE UPDATE OR DELETE ON "audit_log"
	FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
