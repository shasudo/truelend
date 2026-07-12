# truelend

TypeScript monorepo — pnpm workspaces + Turborepo. A single Next.js app that
deploys to **Cloudflare Workers** (via [OpenNext](https://opennext.js.org/cloudflare)),
backed by **Postgres** (through Cloudflare Hyperdrive) and **R2** object storage.

## Layout

```
apps/
  website/  Next.js (App Router) → Cloudflare Workers via OpenNext
            app/api/*  = the API (route handlers)
packages/
  db/                 Drizzle ORM + postgres.js (Postgres via Hyperdrive)
  types/              shared response types (the API ↔ UI contract)
  eslint-config/      shared ESLint flat config
  typescript-config/  shared tsconfig bases
```

## Requirements

- Node — version pinned in [`.nvmrc`](.nvmrc) (`nvm use`)
- pnpm — version pinned in [`package.json`](package.json) `packageManager` (`corepack enable`)
- A [Cloudflare account](https://dash.cloudflare.com) for deploys (`wrangler login`)
- Postgres — any provider (Neon, Supabase, RDS, self-hosted); Hyperdrive pools it

## Commands

Run from the repo root; Turborepo fans each out to the packages that define it.

```bash
pnpm install       # install everything
pnpm dev           # next dev (http://localhost:3000)
pnpm build         # next build
pnpm lint          # eslint
pnpm typecheck     # tsc --noEmit
pnpm format        # prettier --write

pnpm cf-typegen    # regenerate binding types from wrangler.jsonc
pnpm deploy        # opennextjs-cloudflare build && deploy → Workers
```

## Database

`packages/db` is Drizzle over `postgres.js`. In the Worker, connect through the
Hyperdrive binding; migrations run from Node against a direct URL.

```bash
cp packages/db/.env.example packages/db/.env   # set DATABASE_URL
pnpm db:generate   # create a migration from schema.ts
pnpm db:migrate    # apply migrations
pnpm db:studio     # drizzle studio
```

In a route handler / server component:

```ts
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDb, schema } from "@truelend/db";

const { env, ctx } = getCloudflareContext();
const db = createDb(env.HYPERDRIVE.connectionString);
const users = await db.select().from(schema.users);
ctx.waitUntil(db.$client.end()); // one connection per request
```

## Object storage (R2)

The `BUCKET` binding is an [R2 bucket](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/);
its API is already minimal, so there's no wrapper:

```ts
const { env } = getCloudflareContext();
await env.BUCKET.put(key, file);
const object = await env.BUCKET.get(key);
```

## Deploy

1. `wrangler login`
2. Create the resources and paste the ids into [`apps/website/wrangler.jsonc`](apps/website/wrangler.jsonc):
   ```bash
   wrangler hyperdrive create truelend --connection-string="postgres://…"
   wrangler r2 bucket create truelend
   ```
3. `pnpm deploy`

## Dependency versions

Shared versions live once in the `catalog:` block of
[`pnpm-workspace.yaml`](pnpm-workspace.yaml). Packages reference them as
`"catalog:"`. Bump a version there, not in each package.json.

## Deliberately skipped

Add these when a real need shows up, not before:

- **Auth** — no auth wired yet. Add when you have real users.
- **Tests** — no domain logic to test yet (health + wiring is glue). Add vitest
  when the first real module (loan math, validation) lands.
- **A second app** — one Next.js app for now. Add `apps/*` if/when needed.
- **ISR / caching config** — `open-next.config.ts` uses defaults. Wire an
  incremental cache there only if you adopt ISR / on-demand revalidation.
- **Changesets / Husky / remote Turbo cache** — add when publishing, or when
  team size / CI times make them pull their weight.
