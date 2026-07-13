# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

pnpm + Turborepo monorepo for the TrueLend lending platform. Two Next.js 15 (App Router) apps — the public **website** and the internal **admin** dashboard — each deploying as its own **Cloudflare Worker** via OpenNext, backed by a shared **Postgres through Cloudflare Hyperdrive** (Drizzle + postgres.js) and **R2**. No separate API service — route handlers and server actions in each app are its API. Future partner dashboards are more `apps/*`, each its own Worker, sharing `packages/*`. Pending work is tracked in `todo.md` (keep it updated).

## Commands

Run from the repo root; Turborepo fans out to the packages that define each task.

```bash
pnpm install         # install everything
pnpm dev             # next dev → http://localhost:3000
pnpm build           # next build (all packages)
pnpm lint            # eslint
pnpm typecheck       # tsc --noEmit
pnpm format          # prettier --write (format:check in CI)

pnpm db:generate     # drizzle-kit: create migration from packages/db/src/schema.ts
pnpm db:migrate      # apply migrations (needs DATABASE_URL in packages/db/.env)
pnpm db:studio       # drizzle studio

pnpm cf-typegen      # regenerate apps/website/cloudflare-env.d.ts from wrangler.jsonc
pnpm deploy          # deploy the website Worker
pnpm deploy:admin    # deploy the admin Worker
```

Single-package runs: `pnpm --filter @truelend/website <script>` (or `@truelend/admin`). The admin app runs on port 3001 (`pnpm dev` runs both). Seed the first admin: `DATABASE_URL=… BETTER_AUTH_SECRET=… pnpm --filter @truelend/admin seed:admin <email> <password> [name]`. There are no unit tests yet (deliberate); verification is done by driving the apps on the workerd preview against Neon. CI (`.github/workflows/ci.yml`) runs lint → typecheck → build.

## Architecture

```
apps/website/        Public site: Next.js → Workers (OpenNext); writes leads
  app/ components/ content/ lib/   (routes, chrome, typed content + mdx blog, zod/actions)
apps/admin/          Internal ops dashboard: Next.js → Workers (truelend-admin, port 3001, noindex)
  app/(dashboard)/   leads, loan-cases, mis, team, overview — all force-dynamic
  app/login, app/api/auth/[...all]   better-auth
  lib/               auth.ts (request context + guards), queries, *-actions (server actions)
  components/        sidebar, forms, charts (recharts), status-badge
packages/ui/         design system: theme.css (Tailwind v4 @theme tokens) + brand primitives
packages/db/         Drizzle ORM + postgres.js; schema.ts = source of truth (leads, notes, loan_cases, auth tables)
packages/auth/       shared better-auth: createAuth(db,{secret,baseURL}) factory + React client
packages/reference/  canonical product/bank slugs+names + enum labels (used by admin, future partner apps)
packages/types/      type-only package (import type only)
packages/eslint-config/, packages/typescript-config/   shared flat config / tsconfig bases
branding/            logo JPEGs + OG image SVG source (reference assets)
```

### Auth (packages/auth + apps/admin)

- **better-auth**, email+password, no self-signup (admin creates users via the Team page; `role` is a plain text column: `admin`/`employee` now, `partner`/`referral` later — no migration).
- **Per-request factory**: `createAuth(db, {secret, baseURL})` — never a singleton (workerd forbids cross-request I/O reuse). The catch-all route `app/api/auth/[...all]/route.ts` and every server action build their own db+auth and close it with `ctx.waitUntil(db.$client.end())`. RSC reads go through `getAuthContext()` (React.cache) and do NOT close (layout+page share it).
- **Gating**: `middleware.ts` only checks the session cookie exists; real validation is `requireSession()`/`requireAdmin()` in the dashboard layout/pages. Secrets: `BETTER_AUTH_SECRET` via `.dev.vars` + `wrangler secret put`.
- Auth-table ids are `text` (better-auth generates them); people-FKs (`leads.assigned_to`, `lead_notes.author_id`, `loan_cases.created_by`) are text.
- Money is **integer paise** in `bigint({mode:"number"})`; convert rupees↔paise only at the form boundary (`lib/format.ts`), format with `Intl` en-IN. Never floats.
- Charts: single-series recharts, one brand hue, per the dataviz skill — read it before adding charts.

### Design system (packages/ui + Tailwind v4)

- Brand tokens live ONLY in `packages/ui/src/theme.css` (`@theme`): navy scale (logo navy = `navy-800` #14204A), red scale (logo red = `red-600` #CE0E17), `paper` background, `hairline` borders. **The default Tailwind palette is wiped** — off-brand classes like `bg-blue-500` don't compile; that's intentional.
- Fonts: Bricolage Grotesque (`font-display`) + Instrument Sans (`font-sans`) via next/font, bridged in `@theme inline`. Rates/numerals use `tabular-nums`.
- `apps/website/app/globals.css` must keep the `@source "../../../packages/ui/src"` line — Tailwind v4 does not scan symlinked workspace packages; without it, ui-package classes silently vanish from the build.
- New brand-level primitives go in `packages/ui` (future dashboards reuse them); site-specific composites stay in `apps/website/components/`.

### Cloudflare bindings (the core pattern)

Server code gets platform resources from `getCloudflareContext()` (from `@opennextjs/cloudflare`), never from process env:

```ts
const { env, ctx } = getCloudflareContext();
env.HYPERDRIVE.connectionString; // Postgres (pooled by Hyperdrive)
env.BUCKET; // R2 bucket (use its API directly; no wrapper)
```

Bindings are declared in `apps/website/wrangler.jsonc` and typed in `apps/website/cloudflare-env.d.ts` — when you change one, update the other (or run `pnpm cf-typegen`). `initOpenNextCloudflareForDev()` in `next.config.ts` makes bindings work during `next dev`; the Hyperdrive binding falls back to `localConnectionString` locally.

### Database: two connection paths, one schema

- **Runtime (Worker):** `createDb(env.HYPERDRIVE.connectionString)` from `@truelend/db` — one connection per request, closed after the response with `ctx.waitUntil(db.$client.end())`. See `apps/website/app/api/health/route.ts` for the canonical handler shape.
- **Migrations (Node):** drizzle-kit uses a direct `DATABASE_URL` from `packages/db/.env` (see `.env.example`). The Worker never uses `DATABASE_URL`; drizzle-kit never uses Hyperdrive.

Schema changes: edit `packages/db/src/schema.ts` → `pnpm db:generate` → `pnpm db:migrate`.

### Monorepo wiring (why the gotchas exist)

- Workspace packages (`@truelend/db`, `@truelend/types`) ship **raw TypeScript** — no build step. Next.js compiles them via `transpilePackages` in `next.config.ts`. Because of that, use **extensionless relative imports** inside these packages (`./schema`, not `./schema.js` — the `.js` form breaks Next's webpack resolution).
- Dependency versions live once in the `catalog:` block of `pnpm-workspace.yaml`; package.json files reference `"catalog:"`. Bump versions there.
- Route handlers that touch the DB need `export const dynamic = "force-dynamic"`. Pages stay fully static — forms submit through the `submitLead` server action (`apps/website/lib/actions.ts`), which re-validates with the same zod schemas used client-side and verifies Turnstile (env-gated: no `TURNSTILE_SECRET_KEY` = pass-through).
- Blog posts are MDX in `apps/website/content/blog/` compiled at build time (`@next/mdx`); `lib/blog.ts` reads frontmatter with fs at build only — Workers has no runtime fs, so keep blog pages `dynamicParams = false`.
- `apps/website/next-env.d.ts` is committed deliberately so `tsc --noEmit` passes on a fresh checkout without a prior build.
- Deliberate shortcuts are marked with `ponytail:` comments naming the upgrade path.

## Code rules

**Organization — every file has one obvious home:**

- `apps/website/app/` — routes only (`page.tsx`, `layout.tsx`, `route.ts`). Keep route handlers and pages thin: parse input → call logic → shape response.
- `apps/website/components/` — reusable UI components. Pieces used by a single route live next to that route.
- `apps/website/lib/` — non-UI helpers used across routes (formatting, fetch wrappers).
- `packages/db/` — the only place that touches the database. No inline SQL or drizzle calls in components; route handlers go through `@truelend/db`.
- `packages/types/` — shared request/response contracts. If web and a handler both need a type, it goes here.
- Domain logic with no runtime surface (money math, validation rules) → a package, not a route file, so it's reusable and testable.

**Naming:**

- Files and folders: `kebab-case` (`loan-summary.tsx`, `format-currency.ts`). Next.js reserved names (`page.tsx`, `route.ts`, `layout.tsx`) as required.
- React components and types: `PascalCase`. Functions, variables, DB columns follow existing style (`camelCase` in TS, `snake_case` column names in schema.ts).
- Name things for what they do, not how (`getActiveLoans`, not `queryHelper2`).

**Components & reuse (DRY, applied with judgment):**

- Server components by default; add `"use client"` only for state, effects, or browser APIs.
- Extract a shared component/helper when the _third_ usage appears (rule of three). Two similar blocks are cheaper than a premature abstraction with a config surface.
- One responsibility per module/component; compose small pieces rather than extending big ones. Keep functions small enough to name honestly.
- Never copy-paste a type or constant between packages — import it from its home.

**Prefer packages over hand-written code:**

- Don't hand-roll what a well-maintained library already does (validation → zod, dates → date-fns/Temporal, auth → an established provider). Check in this order: already in the repo → already an installed dependency → stdlib/platform → then add a package.
- New dependencies go in the `catalog:` block of `pnpm-workspace.yaml`, referenced as `"catalog:"` — never a version pinned in one package.json.
- Prefer boring, popular, actively maintained packages; avoid micro-deps a few lines can replace.

**Comments:**

- Comment only what the code can't say: constraints, gotchas, whys (`// Hyperdrive pools upstream, keep max small`). Never narrate what the next line does.
- Deliberate shortcuts get a `ponytail:` comment naming the ceiling and upgrade path.

**Correctness & safety:**

- TypeScript strict mode is on; keep it clean — no `any`, no `@ts-ignore` (use `@ts-expect-error` with a reason if truly needed). `import type` for type-only imports.
- Validate all external input at the boundary (route handler request bodies/params) before it reaches logic or the DB.
- Route handlers return proper status codes and never leak internal error details in responses.
- Money is never `float` — use integer cents or `numeric` columns.
- Secrets: never in code or committed files. Local dev → `.dev.vars` / `packages/db/.env` (gitignored); production → `wrangler secret put`.
- Before committing: `pnpm lint && pnpm typecheck && pnpm build` must pass, `pnpm format` applied.

## Workflow

- Commit directly to `main` — no feature branches (solo local repo, no remote).
- First-time deploy needs real Cloudflare resources: `wrangler login`, `wrangler hyperdrive create` (paste id into `wrangler.jsonc`), `wrangler r2 bucket create truelend`.
