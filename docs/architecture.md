# Architecture and trust boundaries

## Runtime topology

TrueLend has three independently deployed Cloudflare Workers generated from Next.js by OpenNext:

```text
Internet ──> website Worker ──> website Hyperdrive ──> PostgreSQL
Staff ──> Cloudflare Access* ──> admin Worker ──> admin Hyperdrive ──> PostgreSQL
                                             └──────> private KYC R2 (read)
Partners ──> partners Worker ──> partner Hyperdrive ──> PostgreSQL
                              └──────────────────────> private KYC R2 (write)

GitHub protected release* ──> migration identity* / Cloudflare deploy API
Email actions ──> Resend (currently via waitUntil; Queue/DLQ pending*)
```

`*` denotes an external control or target architecture that is not closed merely by repository code.

The browser-to-Worker boundary is untrusted. Every route/action revalidates data. Cloudflare-provided `cf-connecting-ip` is used for abuse keys; arbitrary forwarded headers are not trusted. Public lead capture and partner registration require Turnstile tokens tied to distinct actions and expected production hostnames.

## Application boundaries

| Surface  | Authentication                                                       | Primary data operations                                              | Storage capability                                               |
| -------- | -------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Website  | Public; Turnstile and rate limits on mutations                       | Insert leads, readiness probe                                        | No R2 binding                                                    |
| Admin    | Better Auth staff session; Cloudflare Access/MFA required externally | Operational reads/writes, partner decisions, staff management, audit | Private KYC read currently through direct bucket binding         |
| Partners | Better Auth partner session; atomic protected registration           | Partner-owned profile, leads, onboarding, documents                  | Private KYC write/delete currently through direct bucket binding |

Admin and partner auth factories are separate. Partner auth does not load Better Auth's admin plugin, and the partner catch-all blocks raw generic signup and admin endpoint prefixes. Server-side guards remain the authority; cookie-only middleware is not authorization.

## Data flows

### Public lead

1. The server renders a usable form/fallback and a distinct Turnstile action.
2. The browser captures bounded first/last-touch attribution with a 30-day TTL; storage failure is non-fatal.
3. The server validates schema, rate limit, Turnstile token/action/hostname, and optional attribution.
4. The website Worker inserts the lead through Hyperdrive and schedules a best-effort email notification.

### Partner registration and KYC

1. Registration validates stable input, IP/email rate limits, and Turnstile before creating auth/profile records.
2. Authenticated partners submit profile data and one KYC file per request.
3. Upload validates exact origin/fetch metadata, lock state, rate limit, body/file size, MIME, and magic bytes.
4. The file is written to private R2, the database row/audit entry is committed transactionally, and superseded objects are deleted best-effort.
5. Admin access is authenticated/authorized, streamed through the app, and audited.

This is not yet a complete hostile-file pipeline: streaming upload, quarantine, malware scanning, safe preview generation, durable deletion, reconciliation, and recovery remain required.

### Release

1. Pull request checks validate formatting, Wrangler config, lint, types, tests, dependency audit, and builds.
2. Protected-main merge runs data preflight and migration using the CI-only direct database identity.
3. Each Worker checks required secrets/config, builds, performs a Wrangler dry run, scans the exact upload bundle, and deploys.
4. Liveness and protected readiness are checked; failure triggers Wrangler rollback.

## Current privilege matrix and required target

| Identity        | Current repository expectation                        | Required production target                                                                 |
| --------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Website runtime | Hyperdrive binding; app logic limited to leads/health | DB role with only lead insertion and health procedure; no KYC/auth/DDL                     |
| Partner runtime | Hyperdrive plus KYC bucket binding                    | Partner-owned procedures/tables only; quarantine writer capability; no admin reads/DDL     |
| Admin runtime   | Hyperdrive plus KYC bucket binding                    | Operational role without ownership/DDL; narrow KYC reader service; field-level permissions |
| Migration CI    | Direct `DATABASE_URL`                                 | Separate migration owner available only to protected CI                                    |

The committed Wrangler files still reference one shared Hyperdrive configuration. Cloudflare/database role creation, cache disabling, bucket capability separation, and grants/revocations are external P0 work and must be verified before production readiness.

## High-value assets and threats

High-value assets include auth credentials/sessions, contact/lead data, PAN/GST/bank/KYC values and documents, financial facts, audit evidence, database/Cloudflare credentials, and policy consent records. Primary threats include role-boundary bypass, session staleness, credential leakage in artifacts, account/signup abuse, malicious uploads, IDOR, excessive runtime database privilege, audit tampering, inconsistent financial transitions, data loss, and misleading public content.

Repository controls reduce but do not close these risks. Remaining mitigations require named owners, production verification, and external exercises before production readiness.
