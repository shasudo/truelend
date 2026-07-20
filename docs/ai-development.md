# AI-assisted development

This repository is optimized for one developer working with coding agents. `AGENTS.md` is the
authoritative engineering and security contract; this guide is the short routing map for everyday
changes.

## Find the owner before editing

| Change                              | Canonical owner                                      | Typical validation                               |
| ----------------------------------- | ---------------------------------------------------- | ------------------------------------------------ |
| Public route or lead form           | `apps/website/app`, `components`, `lib`              | website lint, typecheck, test                    |
| Staff workflow                      | `apps/admin/app`, `components`, `lib`                | admin lint and typecheck                         |
| Partner workflow or KYC             | `apps/partners/app`, `components`, `lib`             | partners lint, typecheck, test                   |
| Shared domain values or pure policy | `packages/reference/src`                             | reference plus every consumer                    |
| Database shape                      | `packages/db/src/schema.ts` and generated migrations | `pnpm db:check`; resolve targets before mutation |
| Auth boundary                       | `packages/auth` plus the host app boundary           | auth and affected app checks                     |
| Reusable visual primitive           | `packages/ui`                                        | UI tests plus affected app checks                |
| Product imagery                     | `apps/website/public/images/products`                | `pnpm sync:partner-assets`, repository tests     |
| Worker binding or release behavior  | app Wrangler config, scripts, CI                     | Cloudflare validation and Worker artifact checks |

Use `rg` to locate every consumer before moving a value. Update the canonical owner and its tests;
do not patch several copies unless the copies are intentionally host-specific.

## Placement and naming

- Keep `app/` for routes, layouts, pages, and thin server boundaries.
- Put app-wide presentation in `components/` and app-only behavior in `lib/`.
- Put behavior shared by multiple apps in the smallest existing package that owns the domain.
- Name files in kebab-case. Use suffixes that expose their role: `*-actions.ts` for server actions,
  `*-queries.ts` for reads, `*-schema.ts` for one validation schema, `*-schemas.ts` for a cohesive
  schema group, and `*-form.tsx`, `*-screen.tsx`, or `*-dialog.tsx` for UI responsibilities.
- Prefer a named minimal DTO at a server-to-client boundary. Never pass a database entity for
  convenience.
- Split a file when it contains multiple ownership domains or independent change reasons. Do not
  split cohesive static content merely to satisfy a line-count target.

## Comment contract

Comments are for information the code cannot express clearly on its own.

- Use `//` for a local invariant, security boundary, external constraint, or non-obvious reason.
- Use `/** ... */` only for an exported API whose contract is not obvious from its name and types.
- Use `ponytail:` only for an intentional compromise. State the current compromise and the concrete
  trigger for revisiting it in the same comment.
- Do not use `TODO`, `FIXME`, or `HACK` as an unowned backlog. Record future work in the task or an
  issue; use `ponytail:` only when the compromise must remain visible beside the code.
- Do not narrate line-by-line behavior, preserve obsolete history, or duplicate a rule already
  enforced by a type or test.
- When behavior changes, update or remove nearby comments in the same change. A stale comment is a
  defect.

Good:

```ts
// Field names only: PAN, bank, Aadhaar, and nominee values must not enter the audit trail.
```

Good intentional compromise:

```ts
// ponytail: RSC reads rely on idle reclamation; revisit above 80% connection utilization.
```

Avoid:

```ts
// Loop over the rows.
// TODO: clean this up later.
```

## Efficient change loop

1. Read `AGENTS.md` and the nearest owning code, tests, and configuration.
2. Search for all consumers and identify the canonical source of truth.
3. Make the smallest coherent change; preserve unrelated work.
4. Add a focused test for policy, security, parsing, money, or shared UI behavior.
5. Run the narrow workspace lint, typecheck, and test commands while iterating.
6. Run `pnpm check:quick` before handoff; use `pnpm check` for a broad source gate and
   `pnpm check:release` when validating a release candidate.
7. Report exactly what passed and which deployment, database, configuration, recovery, or legal
   evidence remains external.

Repository-policy tests turn stable architecture rules into executable checks. Prefer adding a
small deterministic check over adding another reminder comment when a rule can be enforced.
