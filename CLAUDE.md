# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

pnpm + Turborepo monorepo: a single Next.js 15 (App Router) app that deploys to **Cloudflare Workers** via OpenNext, backed by **Postgres through Cloudflare Hyperdrive** (Drizzle + postgres.js) and **R2** object storage. There is no separate API service — `apps/web/app/api/*` route handlers are the API.

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

pnpm cf-typegen      # regenerate apps/web/cloudflare-env.d.ts from wrangler.jsonc
pnpm deploy          # opennextjs-cloudflare build && deploy → Workers
```

Single-package runs: `pnpm --filter @truelend/web <script>`. There are no tests yet (deliberate — add vitest when the first real domain module lands). CI (`.github/workflows/ci.yml`) runs lint → typecheck → build.

## Architecture

```
apps/web/            Next.js → Workers (OpenNext); app/api/* route handlers = the API
packages/db/         Drizzle ORM + postgres.js; schema.ts is the source of truth
packages/types/      type-only package: API ↔ UI response contract (import type only)
packages/eslint-config/, packages/typescript-config/   shared flat config / tsconfig bases
```

### Cloudflare bindings (the core pattern)

Server code gets platform resources from `getCloudflareContext()` (from `@opennextjs/cloudflare`), never from process env:

```ts
const { env, ctx } = getCloudflareContext();
env.HYPERDRIVE.connectionString  // Postgres (pooled by Hyperdrive)
env.BUCKET                       // R2 bucket (use its API directly; no wrapper)
```

Bindings are declared in `apps/web/wrangler.jsonc` and typed in `apps/web/cloudflare-env.d.ts` — when you change one, update the other (or run `pnpm cf-typegen`). `initOpenNextCloudflareForDev()` in `next.config.ts` makes bindings work during `next dev`; the Hyperdrive binding falls back to `localConnectionString` locally.

### Database: two connection paths, one schema

- **Runtime (Worker):** `createDb(env.HYPERDRIVE.connectionString)` from `@truelend/db` — one connection per request, closed after the response with `ctx.waitUntil(db.$client.end())`. See `apps/web/app/api/health/route.ts` for the canonical handler shape.
- **Migrations (Node):** drizzle-kit uses a direct `DATABASE_URL` from `packages/db/.env` (see `.env.example`). The Worker never uses `DATABASE_URL`; drizzle-kit never uses Hyperdrive.

Schema changes: edit `packages/db/src/schema.ts` → `pnpm db:generate` → `pnpm db:migrate`.

### Monorepo wiring (why the gotchas exist)

- Workspace packages (`@truelend/db`, `@truelend/types`) ship **raw TypeScript** — no build step. Next.js compiles them via `transpilePackages` in `next.config.ts`. Because of that, use **extensionless relative imports** inside these packages (`./schema`, not `./schema.js` — the `.js` form breaks Next's webpack resolution).
- Dependency versions live once in the `catalog:` block of `pnpm-workspace.yaml`; package.json files reference `"catalog:"`. Bump versions there.
- Route handlers that touch the DB need `export const dynamic = "force-dynamic"`.
- `apps/web/next-env.d.ts` is committed deliberately so `tsc --noEmit` passes on a fresh checkout without a prior build.
- Deliberate shortcuts are marked with `ponytail:` comments naming the upgrade path.

## Workflow

- Commit directly to `main` — no feature branches (solo local repo, no remote).
- First-time deploy needs real Cloudflare resources: `wrangler login`, `wrangler hyperdrive create` (paste id into `wrangler.jsonc`), `wrangler r2 bucket create truelend`.
