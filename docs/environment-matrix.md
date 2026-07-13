# Environment and binding matrix

Production, staging, preview, development, and test must use separate databases, Hyperdrives, R2 buckets, rate-limit namespaces, secrets, domains, and email behavior. The repository currently declares production-named resources; creation and isolation of the other environments remain external work.

## Application bindings

| App      | Runtime bindings                                                                                                                            | Runtime secrets                                                                               | Build-time public variables                                                                      | Local ports |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------- |
| website  | `HYPERDRIVE`, `LEAD_RATE_LIMITER`, `ASSETS`                                                                                                 | `TURNSTILE_SECRET_KEY`, `HEALTHCHECK_SECRET`, optional `RESEND_API_KEY`                       | required in production: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`; optional `NEXT_PUBLIC_CF_BEACON_TOKEN` | 3000        |
| admin    | `HYPERDRIVE`, `AUTH_RATE_LIMITER`, `BUCKET`, `ASSETS`                                                                                       | `BETTER_AUTH_SECRET`, `HEALTHCHECK_SECRET`, optional `RESEND_API_KEY`                         | none                                                                                             | 3001        |
| partners | `HYPERDRIVE`, `AUTH_RATE_LIMITER`, `REGISTRATION_RATE_LIMITER`, `PARTNER_WRITE_RATE_LIMITER`, `CSV_IMPORT_RATE_LIMITER`, `BUCKET`, `ASSETS` | `BETTER_AUTH_SECRET`, `TURNSTILE_SECRET_KEY`, `HEALTHCHECK_SECRET`, optional `RESEND_API_KEY` | required in production: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`                                         | 3002        |

Non-secret `EMAIL_FROM`, `TEAM_EMAIL`, `BETTER_AUTH_URL`, and `PARTNERS_URL` values are declared where needed in Wrangler `vars`. Confirm real mailbox ownership and approved addresses before production.

## Direct database variables

`DATABASE_URL` is Node-only and is used by Drizzle generation/migration tools plus audited administrative scripts. It belongs in `packages/db/.env` locally and the protected CI environment for production. Worker code must use `env.HYPERDRIVE.connectionString` and must never receive or bundle `DATABASE_URL`.

Local Hyperdrive can be overridden per process with:

```text
CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE
```

## Local bootstrap

`pnpm bootstrap:local` creates missing gitignored configuration files with localhost/test values and mode `0600`. It never overwrites existing values. Browser-visible development values live in `.env.development.local`; Hyperdrive overrides live in `.dev.vars`. Production builds reject database values in every Next `.env*` variant because OpenNext bundles the environment maps. Cloudflare's always-pass development Turnstile keys are local-only; never use them in staging or production.

## Environment policy

| Environment | Data                                                   | Email                            | Access and deploy policy                                                      |
| ----------- | ------------------------------------------------------ | -------------------------------- | ----------------------------------------------------------------------------- |
| local/test  | Synthetic only; localhost database; local R2 emulation | Disabled or sink                 | Developer machine; never production credentials                               |
| preview     | Synthetic/ephemeral isolated data                      | Sink domain/provider sandbox     | PR-scoped, no production bindings                                             |
| staging     | Isolated production-like data, sanitized fixtures      | Approved staging recipients only | Protected staging Environment and reviewers                                   |
| production  | Real data                                              | Verified domains/recipients      | Protected main + production Environment approval; Cloudflare Access for admin |

Resource IDs, secrets, ownership, rotation dates, and emergency contacts belong in an access-controlled inventory, not this public repository.
