# CLAUDE.md

Repository instructions for coding agents working on TrueLend. Read this file before changing code. Repository implementation alone does not close work that still needs deployment, production verification, external configuration, legal approval, documentation, or recovery testing.

## System overview

TrueLend is a pnpm/Turborepo monorepo with three Next.js 15 App Router apps deployed as separate Cloudflare Workers through OpenNext:

- `apps/website` — public content and lead capture, port 3000
- `apps/admin` — internal staff operations, port 3001
- `apps/partners` — business/referral partner portal, port 3002

There is no separate API service. Route handlers and server actions are the server surfaces. PostgreSQL is accessed with Drizzle/postgres.js through a per-app Hyperdrive binding at runtime. Partners write private KYC documents to R2; admins read them through authenticated routes. The public website must never have a KYC bucket binding.

Shared code belongs in `packages/auth`, `db`, `email`, `health`, `reference`, `turnstile`, `types`, or `ui`. Workspace packages ship raw TypeScript and must be listed in each consuming app's `transpilePackages`.

## Commands

Run from the repository root:

```bash
pnpm bootstrap:local  # create missing local-only config; never overwrites
pnpm dev              # ports 3000, 3001, 3002
pnpm install --frozen-lockfile
pnpm format:check
pnpm cf:validate
pnpm lint
pnpm typecheck
pnpm test
pnpm audit --audit-level high
pnpm build

pnpm db:generate
pnpm db:preflight
pnpm db:migrate
pnpm db:studio
```

Before requesting review, run `pnpm install --frozen-lockfile` and every command from `format:check` through `build` above. Run `pnpm format` after edits. Use `pnpm --filter @truelend/<workspace> <script>` for one package.

## Protected release workflow

- Never commit directly to `main`. Create a branch, open a pull request, obtain the required reviews, and merge only with current required checks.
- `main` must be protected against force-push/deletion. Sensitive auth, infrastructure, migration, finance, and KYC changes require CODEOWNER review and two approvals.
- Merging to `main` starts the production workflow, but deployment must remain gated by required reviewers on the protected GitHub `production` Environment.
- Production secrets and variables belong only in the production Environment or Cloudflare secret storage. Never place them in source, Wrangler `vars`, build output, shell arguments, or logs.
- Do not deploy production from a developer workstation. Manual `pnpm deploy:*` is for isolated development/staging accounts only unless an approved incident runbook explicitly authorizes a production break-glass action.
- Follow `docs/runbooks/release-and-rollback.md` and `docs/runbooks/migrations.md`. A healthy code build does not authorize production release when external P0 controls remain open.

## Authentication boundaries

- Create auth per request; never keep database/auth I/O objects in a cross-request singleton.
- Admin uses `createAdminAuth`: no public signup, eight-hour absolute session, admin plugin available only on the admin host.
- Partners use `createPartnerAuth`: no admin plugin. Raw generic email signup and `/api/auth/admin/*` endpoints must remain blocked on the partner domain. Registration goes only through the atomic, rate-limited, Turnstile-protected workflow.
- Real authorization occurs in server guards/actions. Middleware cookie presence is only an early redirect optimization.
- Never expose reset tokens, activation credentials, raw auth errors, account existence, temporary passwords, or secrets to the client or logs.
- Staff provisioning must reject partner-linked identities, refuse existing users by default, revoke sessions before controlled promotion, and write audit evidence. Passwords are environment input, never command-line arguments.
- Staff and partner password resets must use emailed single-use links. Reset pages use `noindex`, `no-referrer`, and scrub tokens from the URL.

## Cloudflare and secrets

Server code obtains bindings through `getCloudflareContext()`, not `process.env`. Build-time public variables such as `NEXT_PUBLIC_TURNSTILE_SITE_KEY` are the exception.

Each app declares bindings in `wrangler.jsonc` and types in `cloudflare-env.d.ts`; update both or run the relevant `cf-typegen` command. Keep `workers_dev: false`. Use the local Hyperdrive override name `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE`.

Required production secrets:

- website: `TURNSTILE_SECRET_KEY`, `HEALTHCHECK_SECRET`
- admin: `BETTER_AUTH_SECRET`, `HEALTHCHECK_SECRET`
- partners: `BETTER_AUTH_SECRET`, `TURNSTILE_SECRET_KEY`, `HEALTHCHECK_SECRET`

Website and partner production builds also require `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. Missing production Turnstile configuration must fail closed. Each form/registration flow must verify its exact action and the expected hostname.

Public `/api/health` is liveness only. `/api/health/ready` is bearer protected and performs an origin database probe plus critical configuration checks. Do not expose dependency details publicly.

## Database rules

- `packages/db/src/schema.ts` is the source of truth. Generate and commit Drizzle SQL, snapshot, and journal changes together.
- Runtime Workers connect only through `env.HYPERDRIVE.connectionString`. Migrations use a direct `DATABASE_URL` from protected CI or `packages/db/.env`; never bundle it into a Worker.
- Create one database client per request and close it with `ctx.waitUntil(db.$client.end())`, except cached RSC contexts whose request lifetime owns the connection.
- Money is integer paise in `bigint({ mode: "number" })`. Convert at form boundaries with `@truelend/reference`; never use floating-point currency.
- Raw postgres.js with `fetch_types: false` returns `timestamptz` as a string. Convert it with `new Date()` before formatting.
- Avoid conditional empty postgres.js fragments such as `${cond ? sql`...` : sql``}`; use a null-guard predicate.
- Security-sensitive reads require cache-disabled, least-privilege Hyperdrive/database identities. The current shared identity is an open P0 external remediation; do not add stale-tolerant caching to auth, KYC, finance, mutations, or read-after-write paths.
- Migrations must use expand/migrate/contract, bounded timeouts, a recent production-clone test, a restorable checkpoint, and old/new version compatibility. Never contract while rollback-eligible code depends on the old shape.

## KYC and hostile files

- Website must not bind R2. Partner uploads and admin reads need separate authenticated capabilities; a narrow admin reader service remains required before production closure.
- Reject oversized requests before buffering where possible. Validate authentication, authorization, exact Origin/Fetch Metadata, rate limit, declared MIME, file size, and magic bytes.
- Keep objects private. Never add `r2.dev`, public custom domains, public CORS, or presigned/public URLs for KYC.
- Every upload/replacement/read/decision must have audit evidence. Do not weaken locking around KYC review.
- Malware scanning, quarantine, safe previews, resilient deletion, reconciliation, and recovery are still open; do not describe current signature sniffing as a complete hostile-file pipeline.

## Code organization and style

- `app/` contains routes/layouts/pages and thin boundary code; shared app UI goes in `components/`; shared app logic goes in `lib/`.
- Put reusable domain logic in a package. Keep shared types/constants in one canonical home.
- Use server components by default and add `"use client"` only for browser APIs, state, or effects.
- Use strict TypeScript: no `any`, no `@ts-ignore`, and type-only imports where appropriate.
- Validate every external input at the boundary. Return stable, generic public errors and log bounded structured internal context without PII/secrets.
- Keep functions/modules focused. Apply the rule of three before introducing a configurable abstraction.
- Files/folders use kebab-case; components/types use PascalCase; functions/variables use camelCase; database columns use snake_case.
- Centralize dependency versions in `pnpm-workspace.yaml` using `catalog:`. Prefer established dependencies already present over hand-rolled substitutes.
- Comment constraints and reasons, not line-by-line behavior. Mark deliberate shortcuts with `ponytail:` and the upgrade path.

## UI, accessibility, and content

- Brand tokens live in `packages/ui/src/theme.css`; do not use the removed default Tailwind palette. Keep `@source "../../../packages/ui/src"` in website globals so Tailwind scans workspace UI code.
- Use semantic AA text tokens (`text-muted`, `text-on-dark-muted`). Label every control, expose pending/error/success states, use accessible live regions, preserve keyboard focus, and keep skip links/main targets/`aria-current` accurate.
- Server-render meaningful public form/fallback content. Browser storage and transport failures must not strand forms in a pending state.
- Public metadata needs canonical URLs, complete descriptions, and safe structured data. Private/auth routes are `noindex,nofollow`.
- Public contact, rate, legal, and statistical content requires named business/legal ownership and source/freshness evidence. Do not replace placeholders by guessing.

## Tests and change safety

- Add or update focused tests for domain behavior and security boundaries. The root `pnpm test` discovers central and colocated tests.
- Type-aware ESLint, React Hooks, and JSX accessibility rules are required. Do not disable them broadly; test-file floating-promise registration is the narrow exception.
- Preserve unrelated working-tree changes. Never delete generated migrations, user data, secrets, or artifacts destructively.
