# Database migration runbook

## Design

Use expand/migrate/contract across separate releases:

1. Expand with additive nullable columns/tables, non-blocking indexes, or unvalidated constraints.
2. Deploy code that supports both old and new shapes.
3. Backfill in bounded, idempotent batches with progress and reconciliation.
4. Validate constraints/indexes and data integrity.
5. Deploy code that no longer depends on the old shape.
6. Contract only after the rollback window and all old versions are gone.

Avoid table rewrites and long exclusive locks. Set reviewed `lock_timeout` and `statement_timeout`; use concurrent/online index and staged constraint validation patterns supported by the provider.

## Before production

- Generate and review SQL with `pnpm db:generate`; commit SQL, snapshot, and journal.
- Restore or clone a recent production snapshot into an isolated environment.
- Run `pnpm db:preflight`, the migration, all tests, data-integrity checks, and both the current and proposed application versions.
- Capture a provider recovery point and record retention/RPO/RTO plus exact restore instructions in the protected change record.
- Confirm runtime roles do not own the schema or have DDL. Use the CI-only migration identity.

## Apply

Production migrations run only in protected CI with `DATABASE_URL`. Observe duration, locks, errors, and connections. Stop if preflight fails, timeouts are exceeded, unexpected locks appear, or the previous Worker would become incompatible.

## Verify

Run post-migration integrity checks, confirm both old/new compatible read paths where applicable, deploy, and execute release smoke checks. Record migration IDs and timings.

## Failure and recovery

Prefer a forward-compatible corrective migration. Do not blindly run hand-written down SQL. If data loss/corruption or an incompatible destructive change occurs, stop writes, engage the incident lead/database owner, restore into isolation, validate integrity, and promote only under the approved data-recovery plan. A Worker rollback alone cannot undo schema or data changes.
