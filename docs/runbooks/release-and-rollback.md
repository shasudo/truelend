# Release and rollback

## Preconditions

- All changes are reviewed through a protected pull request; sensitive paths have two approvals.
- The protected `production` Environment has a required reviewer and scoped Cloudflare/database/health secrets.
- Required Cloudflare Worker secrets and public Turnstile variables exist.
- Any migration was tested against a recent isolated production clone and has a verified recovery point.
- External P0 controls relevant to the release are satisfied or the release is explicitly blocked.

## Release

1. Merge the approved PR to protected `main`; do not deploy from a workstation.
2. Confirm CI passes lockfile install, format, Wrangler validation, lint, typecheck, tests, high-severity dependency audit, and build.
3. Review migration preflight and migration output. Stop on any unexpected row count, timeout, lock, or compatibility issue.
4. Approve the protected production deployment only after recording commit, migration IDs, approvers, expected behavior, and rollback constraints in the change record.
5. For each app, confirm configuration preflight, OpenNext build, exact Wrangler dry-run bundle scan, and deployment succeed.
6. Confirm public `/api/health` and bearer-protected `/api/health/ready` return 200. Verify the relevant critical workflow with synthetic data and check error/latency logs.

## Automated rollback

The workflow runs `wrangler rollback --yes` if liveness or readiness fails. Confirm rollback completed and repeat the health checks. Record the failed version, restored version, timestamps, and observed impact.

## Important limitation

Worker rollback does not revert database migrations, deleted/changed R2 objects, secrets, rate-limit namespaces, Access policy, DNS, or other resources. Never use Worker rollback as the recovery plan for a destructive or incompatible database/resource change. Expand-only releases must preserve compatibility with the previous Worker until the rollback window closes.

## Manual break glass

Only an authorized incident lead may initiate a manual production rollback using an approved, narrowly scoped Cloudflare token. Record the reason and version first, run the rollback from the controlled incident environment, verify all domains/readiness and affected workflows, then rotate/revoke temporary access. Do not paste credentials or customer data into the incident log.
