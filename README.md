# truelend

TypeScript monorepo — pnpm workspaces + Turborepo.

## Layout

```
apps/
  web/    Vite + React SPA
  api/    Hono service (Node)
packages/
  types/              shared types (the api ↔ web contract)
  eslint-config/      shared ESLint flat config
  typescript-config/  shared tsconfig bases
```

## Requirements

- Node — version pinned in [`.nvmrc`](.nvmrc) (`nvm use`)
- pnpm — version pinned in [`package.json`](package.json) `packageManager` (`corepack enable`)

## Commands

Run from the repo root; Turborepo fans each out to the packages that define it.

```bash
pnpm install       # install everything
pnpm dev           # run web + api in watch mode
pnpm build         # build all
pnpm lint          # eslint
pnpm typecheck     # tsc --noEmit
pnpm test          # vitest
pnpm format        # prettier --write
```

Dev: `web` on http://localhost:5173, `api` on http://localhost:3001. The web
dev server proxies `/api/*` to the api, so the browser calls a single origin.

## Dependency versions

Shared versions live once in the `catalog:` block of
[`pnpm-workspace.yaml`](pnpm-workspace.yaml). Packages reference them as
`"catalog:"`. Bump a version there, not in each package.json.

## Deliberately skipped

Add these when a real need shows up, not before:

- **Next.js** — `web` is a Vite SPA. Swap it if you need SSR / SEO / RSC.
- **Changesets** — versioning/publishing. Only if you publish packages.
- **Docker / deploy manifests** — depends on the target (Fly, ECS, Vercel…).
- **Husky / lint-staged** — pre-commit hooks. Add when the team grows.
- **Remote Turbo cache** — wire up when CI build times start to hurt.
- **`@truelend/core`** — a compiled package for shared *runtime* logic (money
  math, validation). `types` is intentionally type-only.
