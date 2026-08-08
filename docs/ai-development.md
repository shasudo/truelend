# AI-assisted development

This repository is optimized for one developer working with coding agents. `CLAUDE.md` is the
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

File placement, naming, the comment contract, and the change/verification loop are defined once, in
`CLAUDE.md`'s "Code organization and style" and "Toolchain and local workflow" sections — this table
is the only thing this file adds on top of that.
