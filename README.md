# TrueLend

TrueLend is a pnpm/Turborepo monorepo for a lending platform. It contains three Next.js App Router applications deployed as separate Cloudflare Workers through OpenNext:

- `apps/website` — public product content and lead capture (`truelend.in`, port 3000)
- `apps/admin` — staff operations for leads, cases, partners, KYC review, payouts, and team management (`admin.truelend.in`, port 3001)
- `apps/partners` — business/referral partner registration, onboarding, KYC upload, leads, and earnings (`partner.truelend.in`, port 3002)

Shared packages provide Better Auth configuration, Drizzle/Postgres access, email helpers, health responses, reference data, Turnstile verification, types, and the design system. There is no separate API server: route handlers and server actions are each app's server surface.

## Requirements

- Node 24 (see [`.nvmrc`](.nvmrc) and `package.json`)
- pnpm 11.10.0 via Corepack
- PostgreSQL for local development and migrations
- A Cloudflare account only for Worker previews/deployment

## Local setup

```bash
corepack enable
pnpm install
pnpm bootstrap:local
```

`bootstrap:local` creates missing, gitignored local configuration with generated secrets, Cloudflare's development Turnstile keys, and a localhost-only database URL. It never overwrites existing files, writes secret files with mode `0600`, keeps browser-visible values in `.env.development.local`, and moves Hyperdrive overrides to Wrangler's `.dev.vars` so OpenNext cannot bundle database credentials. Start a local PostgreSQL database named `truelend`, then run:

```bash
pnpm db:migrate
pnpm dev
```

The three apps start on ports 3000–3002. See [`docs/environment-matrix.md`](docs/environment-matrix.md) for every binding and variable. Local R2/Hyperdrive behavior is supplied by Wrangler/OpenNext; local database connections default to `postgres://postgres:postgres@localhost:5432/truelend`.

To bootstrap the first administrator in an isolated local or staging database, provide the password through the environment, never the command line:

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/truelend \
BETTER_AUTH_SECRET='local-secret' \
BOOTSTRAP_ADMIN_PASSWORD='use-a-password-manager' \
pnpm --filter @truelend/admin seed:admin admin@example.test 'Local Admin'
```

The script refuses existing accounts by default and rejects partner-linked identities. Controlled promotion requires an explicit `--promote-existing` after an audit.

## Common commands

```bash
pnpm dev                 # all three Next.js dev servers
pnpm format:check        # verify Prettier formatting
pnpm cf:validate         # validate all Wrangler configurations/types
pnpm lint                # type-aware ESLint, React Hooks, accessibility
pnpm typecheck           # strict TypeScript
pnpm test                # central and colocated Node test suites
pnpm audit --audit-level high
pnpm build               # all Next.js production builds

pnpm db:generate         # generate a Drizzle migration
pnpm db:preflight        # check current data before migration
pnpm db:migrate          # apply pending migrations
pnpm db:studio           # launch Drizzle Studio
```

Run a single workspace command with `pnpm --filter @truelend/website <script>` (or `admin`/`partners`).

## Authentication and security boundaries

Admin and partner authentication are separate Better Auth configurations created per request. The admin surface includes the admin plugin and disables public signup. The partner surface omits admin endpoints and accepts signup only through the rate-limited, Turnstile-protected partner registration action. Password reset identifiers are hashed and password resets revoke sessions.

Public lead forms and partner registration validate distinct Turnstile actions and expected hostnames. Production builds fail configuration checks when required public/runtime keys are missing. Every app exposes public liveness at `/api/health` and bearer-protected readiness at `/api/health/ready`.

The website has no R2 binding. Partners write private KYC objects; admins read them through authenticated application routes. Both still share a bucket and must be further separated by a narrow reader service before the P0 KYC-storage item is closed. Current and planned trust boundaries are documented in [`docs/architecture.md`](docs/architecture.md).

## Database and migrations

`packages/db/src/schema.ts` is the schema source of truth. Worker requests connect through each app's `HYPERDRIVE` binding; Node migration tools use `DATABASE_URL` from `packages/db/.env` or protected CI. Never put `DATABASE_URL` in Worker configuration.

For schema changes:

```bash
pnpm db:generate
pnpm db:preflight
pnpm db:migrate
```

Commit the generated SQL, snapshot, and journal changes together. Follow [`docs/runbooks/migrations.md`](docs/runbooks/migrations.md); production migrations require a recent-clone test and recovery point.

## R2 and email

The partner and admin Workers bind the private `truelend` R2 bucket as `BUCKET`. Partner uploads are authenticated, rate-limited, origin-checked, size-limited, and signature-sniffed. Admin downloads are authenticated and audited. Public bucket access and CORS must remain disabled.

Transactional email currently uses Resend through `ctx.waitUntil`. There are no Queue bindings yet, so durable retries, delivery webhooks, suppression, and a DLQ remain open production work in [`TODO.md`](TODO.md).

## Release flow

All changes must go through a pull request into protected `main`. CI installs from the lockfile and runs formatting, Wrangler validation, lint, types, tests, dependency audit, and production builds. A merge to `main` runs migration preflight/migration, then uses the protected GitHub `production` Environment to build and scan each exact Worker upload bundle, deploy it, verify liveness/readiness, and automatically invoke Wrangler rollback if a health check fails.

Cloudflare resource changes, production secrets, branch protection, Environment reviewers, Access/MFA, and backups are managed outside this repository and remain mandatory operational steps. Do not run `pnpm deploy:*` against production from a workstation. See [`docs/runbooks/release-and-rollback.md`](docs/runbooks/release-and-rollback.md).

## Repository map

```text
apps/
  website/       public content and lead capture Worker
  admin/         staff-only operations Worker
  partners/      partner portal Worker
packages/
  auth/          separate admin/partner Better Auth factories and forms
  db/            Drizzle schema, client, migrations, migration preflight
  email/         Resend email helpers (Queue migration still pending)
  health/        liveness/readiness response and bearer-auth helpers
  reference/     compact canonical enums, labels, and money/date helpers
  turnstile/     server-side Turnstile verification policy
  types/         shared type-only contracts
  ui/            shared design system
docs/            architecture, environment matrix, ADRs, and runbooks
```

Dependency versions are centralized in the `catalog:` section of `pnpm-workspace.yaml`. See [`CONTRIBUTING.md`](CONTRIBUTING.md), [`SECURITY.md`](SECURITY.md), and [`TODO.md`](TODO.md) before making changes.
