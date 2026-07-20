# AGENTS.md

Repository-wide instructions for coding agents working on TrueLend. A more specific `AGENTS.md`
may add rules for its subtree. Read the relevant instructions and inspect the surrounding code before
editing.

## Working agreement

- Preserve unrelated work. Check `git status` before editing and review the final diff before handoff.
- Make the smallest coherent change that solves the request. Do not silently widen scope, weaken a
  security control, disable a check, or replace an unknown business value with a guess.
- Treat source, tests, package scripts, and checked-in configuration as evidence of repository
  behavior. Treat deployment, Cloudflare/GitHub settings, production data, legal approval, recovery,
  and live verification as separate evidence.
- Report only what was actually verified. A passing build does not prove that a release is deployed,
  externally configured, legally approved, recoverable, or production-ready.
- Never put real credentials, customer data, KYC documents, banking details, reset links, or other
  sensitive values in source, fixtures, snapshots, command arguments, shared/production logs, or the
  final response. The auth section documents the single localhost-only reset-link exception.

## Architecture and trust boundaries

TrueLend is a pnpm/Turborepo monorepo. Its three Next.js App Router applications are configured to
deploy as separate Cloudflare Workers through OpenNext; dependency versions are centralized in
`pnpm-workspace.yaml`.

| App             | Purpose                          | Local port | Trust and storage boundary                                               |
| --------------- | -------------------------------- | ---------: | ------------------------------------------------------------------------ |
| `apps/website`  | Public content and lead capture  |       3000 | Public, no user-auth surface, and must never receive a KYC R2 binding    |
| `apps/admin`    | Internal staff operations        |       3001 | Staff authorization; authenticated KYC reads and sensitive mutations     |
| `apps/partners` | Business/referral partner portal |       3002 | Partner auth, onboarding, leads, and KYC uploads intended for private R2 |

There is no separate API service. Route handlers and server actions are the server boundary.
PostgreSQL is accessed with Drizzle/postgres.js through each Worker's Hyperdrive binding. Partners
write KYC objects that must remain in private R2 storage; admins currently read them through an
authenticated route.

Reusable runtime code belongs in the existing domain packages under `packages/`; shared lint and
TypeScript configuration belongs in `packages/eslint-config` and `packages/typescript-config`.
Runtime workspace packages ship TypeScript source, so every consuming app must list them in
`transpilePackages`.

Worker runtime code cannot rely on a writable filesystem, a long-lived process, or cross-request I/O
objects. Node-only build, generation, migration, and administrative scripts may use Node APIs.

## Toolchain and local workflow

Use the Node version in `.nvmrc` and the exact pnpm version in the root `packageManager` field. Do not
use npm or Yarn to install dependencies.

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm bootstrap:local
pnpm dev
```

`bootstrap:local` creates or migrates ignored local configuration and preserves existing values where
possible, but it can rename legacy `.env` files, move Hyperdrive overrides, and change file
permissions. Inspect its output. It does not start PostgreSQL; local database `truelend` must exist
before migration or app use.

During iteration, run the narrowest relevant workspace command:

```bash
pnpm --filter @truelend/website lint
pnpm --filter @truelend/website typecheck
pnpm --filter @truelend/website test
```

Replace `website` with the affected workspace and use only scripts declared by that workspace. Format
touched files explicitly, for example `pnpm exec prettier --write AGENTS.md`. Run the repository-wide
`pnpm format` only when the worktree is clean or every resulting change is intentional.

Before requesting review, run the same source and artifact gates as CI:

```bash
pnpm install --frozen-lockfile
pnpm check:release
```

`check:release` runs formatting, Cloudflare type/config drift, database schema/migration drift,
generated blog content, lint, typecheck, tests, audit, all Next.js builds, and build/dry-run/scan
validation for all three OpenNext Worker artifacts. The migration drift check works on an isolated
temporary copy and does not connect to a database. If any required check cannot run, report the exact
command, failure, and reason; do not call the gate passing.

For changes to Worker runtime behavior, bindings, OpenNext, or Wrangler configuration, also validate
each affected app's deployable artifact. For example, for the website:

```bash
pnpm --filter @truelend/website worker:verify
```

Database commands are not generic validation:

```bash
pnpm db:generate   # writes migration SQL and Drizzle metadata
pnpm db:preflight  # queries the database selected by DATABASE_URL
pnpm db:migrate    # mutates the database selected by DATABASE_URL
pnpm db:studio     # opens a live read/write database UI
```

Resolve and verify the exact database target before any of these commands. Use local/development
targets unless the user explicitly authorizes another environment. Production preflight and migration
belong in protected CI, never an ordinary workstation session.

Generated artifacts must be produced by their owner:

- Generate Drizzle migrations with `pnpm db:generate`; do not hand-edit snapshots or the journal.
- Regenerate `apps/website/content/blog-index.ts` with
  `pnpm --filter @truelend/website generate:blog`; do not edit it directly.
- After a binding change, run the matching `pnpm cf-typegen`, `pnpm cf-typegen:admin`, or
  `pnpm cf-typegen:partners`. Wrangler owns `cloudflare-env.d.ts`; hand-written secret augmentation
  stays in `cloudflare-secrets.d.ts`. `pnpm cf:validate` fails if generated bindings drift.
- Let pnpm update `pnpm-lock.yaml`; never edit it by hand.

## Change and release safety

- Never commit directly to `main`. Work on a branch, use a pull request, and merge only with current
  required checks and approvals. `CODEOWNERS` names reviewers but does not itself prove that branch
  protection or approval counts are enabled.
- Auth, infrastructure, migrations, finance, and KYC changes require CODEOWNER review and two
  approvals. Do not weaken `CODEOWNERS`, CI, artifact scanning, health verification, or rollback
  behavior to make a release pass.
- Worker runtime secrets belong in Cloudflare secret storage. CI-only credentials such as
  `DATABASE_URL` and deployment tokens belong in a protected GitHub Environment; values used by both
  CI and a Worker need appropriately scoped copies. Production mutations and deployments must be
  reviewer-gated. Safe reviewed non-secret configuration may use Wrangler `vars`; credentials, tokens,
  private keys, and database URLs may not.
- Do not deploy production from a developer workstation. Checked-in Worker configs target production,
  so `worker:deploy` and the root `pnpm deploy:*` aliases require explicit main-branch release intent
  as a defense against accidents; locally settable flags are not an authorization boundary. Protected
  credentials and GitHub Environment approval provide that boundary. Use local preview for workstation
  validation; an approved incident runbook must define any production break-glass command separately.
  Root `pnpm deploy` intentionally refuses an ambiguous target; use an explicit per-app deploy command
  in approved environments.
- The checked-in workflow is configured to attempt CI, database preflight/migration, and all three
  Worker deployments on a `main` push. Each deployed Worker is health-checked and can be rolled back,
  but Worker rollback does not reverse a migration, R2 change, or other external mutation. Migrations
  must therefore remain compatible with old and new app versions throughout rollout and rollback.
- The workflow builds, dry-runs, and scans all three Worker artifacts before production mutation. Its
  configuration preflight, migration, and deploy jobs declare the `production` Environment. The YAML
  is not evidence that external Environment protection is enabled; verify reviewers, branch policy,
  secret scope, and bypass settings in GitHub before every production-readiness claim.

Do not describe TrueLend as production-ready without current external evidence for branch/environment
protection, admin Access and MFA, per-app cache-disabled least-privilege database identities,
capability-isolated KYC reads, hostile-file controls, secret rotation, monitoring, database and R2
restore exercises, and legal/business approval of public and KYC content. Update such claims only from
verified evidence, not inference from repository files.

## Security baseline

- Validate every external input at the server boundary. Client validation is usability only.
- Every protected server action and route handler must enforce server-side authentication and
  authorization. Intentionally public surfaces must remain explicit and retain validation, origin, and
  rate-limit controls as applicable. Middleware cookie presence is only an early redirect optimization.
- Keep sensitive transitions transactional where possible and write bounded audit evidence for auth,
  role, KYC, finance, and other privileged changes.
- Return stable, generic public errors. Log only bounded structured diagnostic context without PII,
  credentials, tokens, raw provider bodies, KYC values, or banking data.
- Do not add stale-tolerant caching to auth, sessions, permissions, KYC, finance, mutations, readiness,
  or read-after-write paths.

## Authentication and authorization

- Create database and auth objects per request. Never store Worker I/O-backed auth or database objects
  in a cross-request singleton.
- Admin uses `createAdminAuth`: public signup stays disabled, sessions have an eight-hour absolute
  lifetime, and the admin plugin exists only on the admin host.
- Admin and partners share user/account tables. A valid admin-domain session is not sufficient:
  admin pages, reads, and mutations must require an explicit `admin` or `employee` role as appropriate.
- Partners use `createPartnerAuth` without the admin plugin. Raw email signup and every
  `/api/auth/admin` endpoint and descendant must remain blocked on the partner host. Registration must
  go through `registerPartner`, preserving edge rate limits, Turnstile checks, role/profile/audit
  creation, generic errors, and cleanup compensation when Better Auth signup succeeds but application
  setup fails.
- Never reveal account existence, raw auth errors, temporary credentials, activation data, or reset
  tokens to clients or production logs. The existing localhost-only reset-link console fallback must
  not be enabled or generalized in production.
- Staff provisioning must refuse partner-linked or existing identities by default, prevent uncontrolled
  role promotion, revoke sessions before controlled resets/access changes, and write audit evidence.
  Administrative script passwords are environment input, never command-line arguments.
- Staff and partner password resets use emailed single-use links. Keep reset pages `noindex`, use a
  no-referrer policy, and scrub tokens from browser URLs.

## Cloudflare, environment, and email

- Worker runtime bindings come from `getCloudflareContext().env`, not `process.env`. Documented
  Node-side scripts and Next build-time public variables are the exceptions.
- Keep each app's `wrangler.jsonc` and `cloudflare-env.d.ts` synchronized. Preserve
  `workers_dev: false`, existing custom-domain routes, rate-limit bindings, observability, and the rule
  that the website has no `BUCKET` binding.
- Keep host-specific CSP/security headers and asset caching intact. The three Next config header blocks
  are intentionally separate; do not mechanically unify them. Admin and partner auth rate limits
  intentionally share namespace `1001`; preserve that cross-host counter state unless a reviewed
  design replaces it.
- Put local Worker secrets and Hyperdrive overrides in app `.dev.vars`; put only browser-safe
  `NEXT_PUBLIC_*` values in `.env.development.local`; put a direct local `DATABASE_URL` only in
  `packages/db/.env`. Never place a database URL in an app Next `.env*` file because OpenNext can
  bundle it. The required override name is
  `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE`.
- `scripts/assert-production-config.mjs` defines the subset of Worker secret names and public config
  checked by the current pre-deploy assertion; it does not cover CI credentials, live email delivery,
  or external configuration. Website Turnstile uses build-time `NEXT_PUBLIC_TURNSTILE_SITE_KEY`;
  partner registration uses runtime non-secret `TURNSTILE_SITE_KEY`.
- Missing production Turnstile configuration must fail closed. Verify the exact action and expected
  hostname for every protected form or registration flow.
- Public `/api/health` is liveness only. Bearer-protected `/api/health/ready` performs an origin
  database probe and critical configuration checks. Keep both uncached and never expose dependency
  details to unauthorized callers.
- `RESEND_API_KEY` is deploy-gated and email helpers may no-op without it in local development. Any
  flow that depends on delivery, especially activation or reset, must fail closed in production. A
  secret-name check does not prove delivery; do not claim email readiness without live send/receive
  evidence.

## Database, money, and migrations

- `packages/db/src/schema.ts` is the schema source of truth. Commit generated SQL, snapshots, and
  `_journal.json` together. Treat committed/applied migrations as append-only; correct them with a new
  migration.
- Runtime Workers connect only with `env.HYPERDRIVE.connectionString`. Direct `DATABASE_URL` access is
  for protected CI or local Node tooling and must never be bundled into a Worker.
- Actions and route handlers create one database client per request and close it with
  `ctx.waitUntil(db.$client.end())`. Existing React-cached RSC auth contexts deliberately share an
  unclosed request client and rely on Hyperdrive idle reclamation; this is a documented `ponytail`, not
  a pattern to copy elsewhere.
- Money is integer paise using `bigint({ mode: "number" })` and must stay within JavaScript's safe
  integer range. Convert form input with `@truelend/reference`; never use floating-point currency.
- postgres.js uses `fetch_types: false`; raw `timestamptz` values arrive as strings. Convert them with
  `new Date()` before date formatting and safely normalize numeric aggregate strings.
- Avoid conditional empty postgres.js fragments such as
  ``${condition ? sql`...` : sql``}``; use an explicit null-guard predicate.
- `pnpm db:preflight` checks the known row-shape invariants in its script; it does not prove lock
  safety, rollback compatibility, backups, or recoverability.
- Use expand/migrate/contract with bounded timeouts, old/new version compatibility, a recent
  production-clone test, and a restorable checkpoint. Never contract while rollback-eligible code
  still depends on the old shape. Record external test/checkpoint evidence rather than assuming it.

## KYC and hostile files

- Keep KYC objects private. Never add `r2.dev`, a public custom domain, public CORS, public/presigned
  object URLs, or a KYC storage capability to the website. Verify live bucket public-access and CORS
  settings separately; source configuration alone does not prove them.
- R2 bindings are capability-wide, not method-level read-only. The current admin bucket binding and
  authenticated route do not prove isolated read-only access; production readiness requires an
  independently enforced narrow reader capability.
- Before accepting an upload, preserve authentication, partner authorization, exact Origin plus the
  current Fetch Metadata policy, rate limiting, an explicit document-type and MIME allowlist, bounded
  request/file size, and magic-byte validation. Reject oversized requests before buffering when
  possible.
- Preserve KYC edit locking and transactional review decisions. Every upload, replacement, read,
  decision, deletion, and privileged state transition needs audit evidence and least privilege.
- Signature sniffing is not malware protection. Do not describe the current upload path as a complete
  hostile-file pipeline without verified quarantine, malware scanning, safe previews, resilient
  deletion, reconciliation, retention, and recovery controls.

## Code organization and style

- For structural, naming, or comment changes, use `docs/ai-development.md` as the task-routing guide;
  this file remains the authoritative security and engineering contract.
- Keep `app/` focused on routes, layouts, pages, and thin boundaries. App-shared UI belongs in
  `components/`; app-shared logic belongs in `lib/`; cross-app domain logic belongs in a package.
- Use Server Components by default. Add `"use client"` only for browser APIs, local interactive state,
  or effects.
- Keep TypeScript strict: no `any`, no `@ts-ignore`, and use type-only imports where appropriate.
- Files and folders use kebab-case; components and types use PascalCase; functions and variables use
  camelCase; database columns use snake_case.
- Keep external dependency versions in the root pnpm catalog and internal dependencies on
  `workspace:*`; use explicit compatibility ranges only for peer dependencies. Preserve the audited
  `allowBuilds` list and scoped security overrides. Prefer an established dependency already in the
  repository.
- Extract shared behavior when multiple consumers or a security invariant need one canonical
  implementation; avoid speculative frameworks.
- Comment constraints and reasons, not line-by-line behavior. Use JSDoc only for non-obvious exported
  contracts. Do not use `TODO`, `FIXME`, or `HACK` as an unowned backlog. Mark an intentional
  compromise with `ponytail:` and state the concrete trigger or path for revisiting it.

## UI, accessibility, and public content

- Brand tokens live in `packages/ui/src/theme.css`; the default Tailwind palette is intentionally
  removed. Preserve `@source "../../../packages/ui/src"` in every app's `app/globals.css` so Tailwind
  scans the shared UI package.
- Use readable semantic text tokens such as `text-muted` and `text-on-dark-muted`. Preserve visible
  focus, keyboard operation, reduced-motion behavior, and sufficient contrast.
- Label every control and expose pending, error, empty, and success states accessibly. Use appropriate
  live regions, retain focus through updates, and keep skip links, `main` targets, and `aria-current`
  correct.
- Server-render meaningful public form/fallback content. Storage, hydration, network, and provider
  failures must not leave a form permanently pending or unusable.
- Public pages need canonical metadata, complete descriptions, and safe structured data. Auth,
  dashboard, reset, and other private routes remain `noindex,nofollow` as appropriate.
- Public contact details, rates, legal terms, KYC notices, claims, and statistics require a named
  business/legal owner plus source and freshness evidence. Keep explicit placeholders visible or
  report them as blocked; never invent production content.

## Tests, review, and handoff

- Add or update focused tests for changed domain behavior and security boundaries. The root
  `pnpm test` runs central tests plus test scripts declared by workspaces; add a workspace `test` script
  when introducing its first suite. Preserve existing coverage and add appropriate coverage for money,
  authorization, registration, Turnstile, KYC locking, and state transitions when those areas change.
- Type-aware ESLint, React Hooks, and JSX accessibility rules are required. Do not broadly disable
  them; fix the cause or use the narrow existing test registration exception only where applicable.
- Never delete or rewrite user data, secrets, generated migration history, or unrelated artifacts to
  make a check pass.
- At handoff, state the files changed, checks run and their results, checks not run, and every remaining
  deployment/configuration/legal/recovery step. Never claim deployed or production-ready without
  verification of the exact release in the target environment.
