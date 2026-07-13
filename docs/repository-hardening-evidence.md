# Repository hardening evidence — 2026-07-13

This records implementation completed from `TODO.md`. It is not production-verification evidence and does not override the backlog's completion definition.

## Security and infrastructure

| Backlog area           | Repository implementation                                                                                                                                                                                                                                                                                                                                         | Remaining closure gates                                                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Turnstile              | Shared fail-closed verifier validates secret/site-key presence, token, exact action, and hostname; distinct lead/registration actions; unit tests; protected config preflight; readiness checks                                                                                                                                                                   | Configure protected production keys/secrets, deploy, synthetic live submissions, external monitoring/alerting                          |
| Hyperdrive readiness   | Readiness uses a unique origin query including backend/time rather than a cacheable `select 1`                                                                                                                                                                                                                                                                    | Disable caching and create separate least-privilege Hyperdrives/roles in Cloudflare/Postgres; immediate-revocation integration tests   |
| Public KYC capability  | Website R2 binding/type removed; exact upload-bundle scan rejects forbidden website bucket capability                                                                                                                                                                                                                                                             | Deploy/inspect artifact; create narrow admin reader service; prove bucket/public/CORS policies and denied website operations           |
| Credential artifacts   | Production builds reject database values in production-loaded env files; local config is development-only; CI builds Workers, runs Wrangler dry-run, scans exact upload text/source maps for database URLs/private keys/Resend keys, checks size, and deploys that build; local bootstrap writes mode `0600`; workstation production deploy is prohibited in docs | Rotate potentially exposed credentials, remove historical artifacts/backups, isolate environments, externally verify uploaded artifact |
| Admin perimeter        | `workers_dev: false` for all apps                                                                                                                                                                                                                                                                                                                                 | Configure and test Cloudflare Access, MFA, posture, allowlist, and monitor service token                                               |
| Historic role boundary | Partner auth lacks admin plugin/endpoints; generic signup blocked; default role cannot be staff; bootstrap rejects partner-linked identities; regression tests                                                                                                                                                                                                    | Complete private incident investigation, revoke/rotate as needed, and obtain closure approval                                          |
| Release protection     | CODEOWNERS, pinned runner, SHA-pinned Actions, protected `production` Environment in workflow, config preflight, health verification, automated rollback, Dependabot                                                                                                                                                                                              | Configure branch/Environment/repository policies and required approvals in GitHub; verify production release/rollback                  |

## Authentication and mutations

- Separate per-request admin/partner Better Auth factories and clients. Partner admin/enumeration routes are absent and tested.
- Partner registration is the only signup flow; it uses stable public codes, generic non-enumerating errors, Turnstile, IP and hashed-email rate-limit keys.
- Verification identifiers are hashed; password reset revokes sessions; staff has an eight-hour absolute session and five-minute freshness; partner policy is seven days with daily refresh and 15-minute freshness.
- Reset tokens are scrubbed from URLs; reset/auth pages use `noindex,nofollow`, and reset pages use `Referrer-Policy: no-referrer`.
- Admin bootstrap no longer accepts password argv, refuses existing accounts by default, rejects partner-linked identities, revokes sessions on promotion, and writes an audit record.
- Team creation/reset emails single-use password setup/reset links rather than returning temporary passwords; public mutation errors are generic and internal errors are structured.
- Shared auth/lead forms handle transport exceptions with `try/catch/finally`; sign-out redirects only on success; all apps have root error boundaries.

Remaining auth work includes verified email/phone policy, device/ASN throttling, abandoned-account cleanup, session/device UI, notifications, breached-password checks, full reset integration tests, invitation expiry/MFA enrollment, administrator invariant, and the complete least-privilege authorization matrix.

## KYC, data, and audit

- Uploads enforce authentication, lock state, rate limiting, exact Origin/Fetch Metadata, pre-buffer content length, five-megabyte size, allowed MIME, and magic bytes.
- KYC reads now write audit evidence; uploads already audit and serialize replacement/lock checks.
- First- and last-touch UTM values are bounded, optional, separately persisted, protected from corrupt storage, and expire after 30 days. Migration `0009_amazing_callisto.sql` adds last-touch columns.

Quarantine, malware scanning, safe previews, streaming/direct upload, durable deletion/DLQ, object reconciliation, encryption, masking, consent/rights workflows, expanded audit coverage, and external immutable audit storage remain open.

## CI, tests, and operations

- Root/Turbo test discovery now runs central and colocated suites. Tests cover Turnstile policy, auth surface boundary, money conversion/formatting, attribution hardening, and onboarding rules.
- Type-aware TypeScript ESLint floating/misused-promise rules, React Hooks lint, and JSX accessibility lint are enabled. Node test registration has a narrow floating-promise exception.
- CI runs format, Wrangler validation, lint, typecheck, tests, high-severity audit, and builds on pinned Node 24/Ubuntu 24.04; deployment performs configuration checks, exact bundle scan, protected liveness/readiness, and rollback on failure.
- Liveness and protected readiness endpoints exist for all three apps. Readiness checks origin database access and critical app configuration.
- Migration preflight validates existing role/account/document/lead/money/payout/review invariants before migration.

Postgres-backed/Workers-runtime/component/E2E/accessibility/load/mutation tests, coverage thresholds, CodeQL/dependency-review/secret-scanning services, SBOM/provenance/attestation, immutable cross-environment artifact promotion, staging smoke tests, and production change-log automation remain open.

## Frontend, accessibility, SEO, and bundle hygiene

- Public forms render useful server/no-JavaScript fallback content; product query selection is server-resolved; browser storage and network failure are non-fatal.
- Semantic AA muted/on-dark tokens replace low-contrast navy/translucent text. Previously unlabelled note, rejection, role, and CSV controls are labelled; authenticated apps have skip links/main targets/`aria-current`; progress/success states expose busy/live/focus semantics.
- The infinite partner marquee is now a static list. Route/entity titles and public/private robots metadata were expanded.
- Public canonical URLs, complete word-boundary descriptions, article Open Graph fields, Organization/FinancialService, Article/Service, and breadcrumb JSON-LD were added; partner sitemap/robots behavior was tightened.
- Direct Radix packages replace the umbrella import. Compact products live in `@truelend/reference`; form schemas no longer pull rich product content. Blog frontmatter is generated at build time so `gray-matter` is development-only and runtime filesystem parsing is removed.

Full component/E2E/axe/visual/keyboard/screen-reader/reflow testing, per-route JavaScript budgets, RUM budgets, collection pagination, search/query optimization, and database performance baselines remain open.

## Documentation and developer workflow

- `README.md` now describes all apps, auth, tests, database, KYC R2, the absence of durable Queues, and the actual protected release workflow.
- `CLAUDE.md` now requires protected pull requests and approved production releases, and records current security boundaries/gotchas.
- `pnpm bootstrap:local` creates missing local-only configs without overwriting and with mode `0600`; complete app `.env.example`/`.dev.vars.example` files document bindings.
- Architecture/trust boundaries/data flows/current-vs-target privilege matrix, environment matrix, release/rollback, migration, credential rotation, and recovery-exercise runbooks were added.
- `CONTRIBUTING.md`, `SECURITY.md`, CODEOWNERS, a runbook index, and the auth-surface ADR were added. Node 24, the CI runner, and Turbo Next outputs are pinned/corrected.

Ownership/review cadences, complete operational contacts/commands, production privilege evidence, and completed restore/incident exercises require named external owners and remain open.
