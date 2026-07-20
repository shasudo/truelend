# TrueLend

TrueLend is a pnpm/Turborepo monorepo with three Next.js App Router applications deployed as
separate Cloudflare Workers through OpenNext.

| Workspace       | Responsibility                                                  | Local port |
| --------------- | --------------------------------------------------------------- | ---------: |
| `apps/website`  | Public product content and lead capture                         |       3000 |
| `apps/admin`    | Staff operations and authenticated KYC review                   |       3001 |
| `apps/partners` | Partner registration, onboarding, leads, and private KYC upload |       3002 |

There is no separate API service. Route handlers and server actions are the server boundary. Shared
runtime behavior belongs in a focused package under `packages/`.

## Start locally

Use the Node version in `.nvmrc` and the pnpm version pinned in `package.json`.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm bootstrap:local
```

Start a local PostgreSQL database named `truelend`, then run:

```bash
pnpm db:migrate
pnpm dev
```

`bootstrap:local` creates missing ignored development files without overwriting existing values. It
does not start PostgreSQL. Inspect its output because it can migrate legacy local environment values
and tighten file permissions.

## Development loop

Prefer the narrowest workspace check while iterating:

```bash
pnpm --filter @truelend/website lint
pnpm --filter @truelend/website typecheck
pnpm --filter @truelend/website test
```

Canonical repository gates:

```bash
pnpm check:quick    # lint, typecheck, tests
pnpm check          # formatting, config/type drift, migration drift, generated content, quick gate
pnpm check:release  # full source gate, audit, Next builds, and all Worker artifact checks
```

Use an affected app's `worker:verify` while iterating on Worker runtime or bindings. Deploy commands
require explicit main-branch release intent as a defense against accidental workstation deployment;
protected credentials and GitHub Environment approval remain the authorization boundary.

## Repository map

```text
apps/
  website/           public Worker
  admin/             staff-only Worker
  partners/          partner Worker
packages/
  auth/              host-specific Better Auth factories and forms
  db/                Drizzle schema, migrations, and database client
  email/             Worker-safe transactional email helpers
  health/            liveness/readiness contracts and authorization
  reference/         canonical domain policy, labels, options, and money helpers
  turnstile/         server-side Turnstile verification policy
  eslint-config/      shared type-aware lint policy
  typescript-config/  shared strict TypeScript policy
  ui/                shared design system and brand theme
scripts/             repository, build, release, and safety checks
tests/               repository architecture-policy tests
```

Read [AGENTS.md](./AGENTS.md) before changing the repository. It is the authoritative engineering and
security contract. [Architecture](./docs/architecture.md) explains ownership and trust boundaries;
[UI engineering](./docs/ui-engineering.md) records the visual conventions; and
[AI-assisted development](./docs/ai-development.md) is the concise routing, naming, comment, and
validation guide for everyday changes.

## Release status

Passing repository checks proves only the checked-in code and generated artifacts. It does not prove
GitHub protection, Cloudflare configuration, private-bucket settings, production data safety, email
delivery, backups, restore readiness, monitoring, or legal approval. Those require current external
evidence before TrueLend can be described as production-ready.
