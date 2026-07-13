# Contributing to TrueLend

## Before you start

Read `CLAUDE.md`, `TODO.md`, and the relevant architecture/runbook documents. Do not use a code change to claim closure of work that also needs Cloudflare/GitHub configuration, production verification, legal approval, monitoring, or a recovery exercise.

Create a branch from current `main` (use the `codex/` prefix for Codex-created branches), keep the change focused, and open a pull request. Direct pushes and force-pushes to `main` are prohibited. Sensitive paths are assigned in `.github/CODEOWNERS`; auth, infrastructure, migrations, finance, and KYC changes require two approvals.

## Local development

```bash
corepack enable
pnpm install
pnpm bootstrap:local
pnpm db:migrate
pnpm dev
```

`bootstrap:local` only creates missing gitignored files and points migrations at localhost. Do not copy production credentials or customer data into local or test environments.

## Changes

- Put route/page boundaries in the relevant app, shared domain logic in a package, and schema/migrations in `packages/db`.
- Validate untrusted input at the boundary and return stable public errors without internal or personal details.
- Keep money as integer paise and use `@truelend/reference` conversions.
- Add or update focused tests. Security boundary changes need a regression test.
- Schema changes require `pnpm db:generate`; commit generated SQL, snapshot, and journal together.
- Add dependencies to the workspace `catalog:` and explain why the dependency is needed.
- Never commit secrets, production identifiers that grant access, `.env` files, generated Worker output, or customer/KYC data.

## Required verification

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm cf:validate
pnpm lint
pnpm typecheck
pnpm test
pnpm audit --audit-level high
pnpm build
```

Run `pnpm format` before the final check. For migration, Worker, auth, KYC, or financial changes, also follow the applicable runbook and include test/rollback evidence in the pull request.

## Pull request evidence

Describe the problem, behavior change, tests, data/configuration impact, rollout order, and rollback. Explicitly list any external action still required. Include screenshots only when they help reviewers verify UI behavior, and never include real personal or KYC data.
