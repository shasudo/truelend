# TrueLend Production Hardening TODO

Last updated: 2026-07-13

This is the prioritized execution backlog from the full codebase, security, infrastructure, data, product, accessibility, and development-cycle audit.

## Priority and completion rules

- **P0 — Production blocker:** address immediately. Do not onboard real partners, collect KYC documents, settle payouts, or run paid campaigns while these remain open.
- **P1 — Required for production:** close before declaring the platform production-ready.
- **P2 — Operational maturity:** close before scaling usage or adding a larger engineering/operations team.
- **P3 — Optimization:** improve after the security and reliability baseline is stable.
- A checked leaf item records the repository implementation completed and verified in this round. A section is production-complete only when its implementation, automated tests, deployment, production verification, documentation, and rollback/recovery instructions satisfy its “Done when” criteria.
- Every section must have a named owner and target date before work begins.

## Repository implementation update — 2026-07-13

All independently actionable repository changes completed in this pass are recorded in [`docs/repository-hardening-evidence.md`](docs/repository-hardening-evidence.md). The checkboxes below intentionally remain open unless their full completion rule is met. In particular, repository code cannot prove Cloudflare/GitHub configuration, database privileges/cache settings, secret rotation, production behavior, legal/business approval, external monitoring, incident closure, or recovery exercises.

The implementation now covers substantial portions of P0-01, P0-02 (origin readiness only), P0-04, P0-05 (CI artifact safeguards only), P0-07 (regression invariant only), P0-08 (repository policy files/workflow only), and the repository-capable P1/P2 auth, registration, session, staff provisioning, KYC boundary, release health/rollback, testing, accessibility, SEO, performance, infrastructure configuration, and documentation items. These are **implemented pending their remaining section-specific deployment and verification gates**, not production-closed.

## P0 — Immediate production blockers

### P0-01 Restore production Turnstile protection

- [ ] Assign an owner and target date.
- [ ] Configure `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in a protected GitHub `production` Environment.
- [ ] Confirm `TURNSTILE_SECRET_KEY` exists in the website Worker.
- [ ] Declare the secret as required in Wrangler configuration.
- [x] Add a production build assertion that both keys are present.
- [x] Make missing production configuration fail closed; any break-glass bypass must be explicit, time-limited, logged, and paged.
- [x] Set and verify a distinct Turnstile `action` for each public form.
- [x] Add a synthetic submission proving a missing/invalid token is rejected.
- [x] Add a post-deploy check for `/api/health` and block or roll back an unhealthy release.
- [ ] Add an external monitor and alert for Turnstile health.

Done when: the live health endpoint is HTTP 200, every public form renders the widget, invalid tokens fail, and CI cannot deploy an unconfigured production build.

Evidence: [`packages/turnstile/src/index.ts`](packages/turnstile/src/index.ts), [`.github/workflows/ci.yml`](.github/workflows/ci.yml), [`apps/website/app/api/health/ready/route.ts`](apps/website/app/api/health/ready/route.ts).

### P0-02 Disable Hyperdrive caching for security-sensitive reads

- [ ] Assign an owner and target date.
- [ ] Disable caching on the current shared Hyperdrive immediately.
- [ ] Create separate cache-disabled Hyperdrive configurations for website, admin, and partners.
- [ ] Route authentication, sessions, bans, permissions, KYC state, billing, mutations, and read-after-write queries through cache-disabled bindings.
- [ ] Allow cached database reads only through a separately named binding and only for documented stale-tolerant analytics.
- [x] Replace the current cached `select 1` readiness probe with a reliable origin-database check.
- [ ] Add tests proving session revocation, role demotion, bans, and KYC locks take effect immediately.

Done when: Cloudflare reports caching disabled for every security/fresh binding and automated tests demonstrate immediate revocation and read-after-write consistency.

Evidence: [`apps/admin/wrangler.jsonc`](apps/admin/wrangler.jsonc), [`apps/partners/wrangler.jsonc`](apps/partners/wrangler.jsonc), [`apps/website/wrangler.jsonc`](apps/website/wrangler.jsonc), [`packages/db/src/client.ts`](packages/db/src/client.ts).

### P0-03 Replace the shared database-owner runtime identity

- [ ] Assign an owner and target date.
- [ ] Create a migration-only database owner available solely to protected CI.
- [ ] Create a website role limited to the minimum lead-capture and health operations.
- [ ] Create a partner role limited to partner-owned workflows.
- [ ] Create an admin runtime role with necessary operational access but no ownership or DDL.
- [ ] Create one Hyperdrive configuration per app, role, and environment.
- [ ] Revoke schema ownership, `CREATE`, role management, unrestricted table access, and DDL from every runtime role.
- [ ] Prefer narrowly scoped stored procedures for lead insertion and sensitive financial/KYC transitions.
- [ ] Add a CI assertion that no runtime connection uses an owner/superuser role.
- [ ] Document the database privilege matrix.

Done when: each deployed Worker uses its own least-privilege identity and no runtime identity owns the database or schema.

### P0-04 Remove KYC storage capability from the public website

- [ ] Assign an owner and target date.
- [x] Remove `BUCKET` from the website Wrangler configuration and generated types.
- [x] Verify website source and the uploaded Worker artifact contain no KYC storage binding.
- [ ] Separate partner upload/delete capability from admin read capability.
- [ ] Introduce a narrow authenticated KYC reader Worker/service binding for admin access.
- [ ] Confirm `r2.dev`, public custom domains, and public CORS remain disabled.
- [ ] Add a deployment test that the website Worker cannot read, write, list, or delete KYC objects.

Done when: the public website has no path or binding capable of accessing KYC data.

Evidence: [`apps/website/wrangler.jsonc`](apps/website/wrangler.jsonc), [`apps/admin/wrangler.jsonc`](apps/admin/wrangler.jsonc), [`apps/partners/wrangler.jsonc`](apps/partners/wrangler.jsonc).

### P0-05 Eliminate credentials from local and deployment artifacts

- [ ] Assign an owner and target date.
- [ ] Determine whether any manual deployment used the current remote database credentials.
- [ ] Rotate every potentially bundled database credential.
- [x] Securely remove ignored `.open-next` and `.wrangler` artifacts containing credentials.
- [ ] Replace remote owner credentials in local app environment files with isolated development credentials.
- [ ] Create separate development and staging databases/branches.
- [ ] Stop production deployment from developer workstations.
- [x] Build production artifacts hermetically in CI.
- [x] Secret-scan the exact Wrangler upload bundle and source map before deployment.
- [x] Set local secret files to mode `0600` or move them to a developer secrets manager.
- [ ] Exclude secret-bearing build directories from cloud backup/sync.

Done when: rotated credentials are in use, local builds cannot reach production, and the deployment job proves no database URL is present in the uploaded artifact.

### P0-06 Protect the admin perimeter with Access and MFA

- [ ] Assign an owner and target date.
- [ ] Put `admin.truelend.in` behind Cloudflare Access.
- [ ] Allow only an explicit staff identity/group list.
- [ ] Require MFA and short Access sessions.
- [ ] Add device posture requirements where available.
- [ ] Retain Better Auth as a second authentication layer.
- [ ] Protect or disable `workers.dev` and preview hostnames so Access cannot be bypassed.
- [ ] Create a narrowly scoped service-token policy for synthetic monitoring only.
- [ ] Test denial for unauthorised identities and alternate hostnames.

Done when: the admin login cannot be reached without passing Access/MFA and no alternate hostname bypass exists.

### P0-07 Close the historical partner-to-staff authorization incident

- [ ] Assign a security owner and incident identifier.
- [ ] Preserve the relevant deployment, authentication, Cloudflare, and database evidence.
- [ ] Review every historical `admin` and `employee` account against authorised staff records.
- [ ] Check partner-profile overlap, signup IP/time, user agent, sessions, audit activity, and admin access during the vulnerable window.
- [ ] Revoke suspicious accounts and all affected sessions.
- [ ] Rotate authentication/database credentials if compromise remains plausible.
- [ ] Document timeline, impact, root cause, containment, recovery, and prevention.
- [x] Add a permanent automated invariant preventing non-staff signup from receiving a staff role.
- [ ] Obtain explicit incident closure approval.

Done when: the vulnerable period is investigated, evidence and decisions are documented, affected sessions are invalidated, and regression tests enforce the role boundary.

Evidence: [`apps/admin/scripts/audit-roles.ts`](apps/admin/scripts/audit-roles.ts), [`packages/auth/src/index.ts`](packages/auth/src/index.ts), [`apps/admin/lib/auth.ts`](apps/admin/lib/auth.ts).

### P0-08 Protect production releases

- [ ] Assign an owner and target date.
- [ ] Stop direct-to-`main` production deployment until protection is active.
- [ ] Use a GitHub plan/account or repository host supporting protected private branches.
- [ ] Require pull requests, current CI checks, resolved conversations, and no force-push/deletion.
- [x] Add `CODEOWNERS`.
- [ ] Require two approvals for auth, infrastructure, migration, financial, and KYC changes.
- [ ] Create protected `staging` and `production` Environments.
- [ ] Scope production secrets and variables to the production Environment.
- [ ] Require production deployment approval.
- [ ] Restrict allowed GitHub Actions and enforce full-SHA pinning at repository policy level.

Done when: no individual push or compromised write account can directly migrate and deploy production.

Evidence: [`.github/workflows/ci.yml`](.github/workflows/ci.yml), [`CLAUDE.md`](CLAUDE.md).

### P0-09 Replace public placeholder and interim content

- [ ] Assign business, legal, and rate-data owners.
- [ ] Replace the placeholder phone, WhatsApp, email, address, and operating hours.
- [ ] Remove or substantiate borrower, lender, transparency, and fee statistics.
- [ ] Replace placeholder lender rates and product terms with dated, sourced, owned data.
- [ ] Add freshness/expiry rules for every displayed rate.
- [ ] Replace interim privacy and terms pages with counsel-approved documents.
- [ ] Add partner privacy, terms, KYC notice, and acknowledgement flows.
- [ ] Store the accepted policy version/hash and timestamp.
- [ ] Remove or complete public “Coming soon” resources.
- [ ] Add a build-time content check rejecting placeholder flags, sentinel contact values, interim legal text, unsupported statistics, and expired rates.

Done when: production contains no known placeholder or interim content and the build fails if it is reintroduced.

Evidence: [`apps/website/content/site.ts`](apps/website/content/site.ts), [`apps/website/components/stats-band.tsx`](apps/website/components/stats-band.tsx), [`apps/website/content/products.ts`](apps/website/content/products.ts), [`apps/website/app/privacy/page.tsx`](apps/website/app/privacy/page.tsx), [`apps/website/app/terms/page.tsx`](apps/website/app/terms/page.tsx).

### P0-10 Verify recoverability before further production use

- [ ] Assign an owner and target date.
- [ ] Confirm database PITR is enabled and document its retention window.
- [ ] Capture a known-good database recovery point.
- [ ] Define R2 recovery/versioning/backup strategy for KYC documents.
- [ ] Document business-approved RPO and RTO.
- [ ] Perform a database restore into an isolated environment.
- [ ] Perform an R2/KYC recovery exercise.
- [ ] Record timings, gaps, ownership, and exact recovery commands.
- [ ] Schedule quarterly restore exercises.

Done when: both database and KYC data have been restored successfully in a timed, documented exercise.

## P1 — Authentication and account lifecycle

### Separate admin and partner authentication surfaces

- [x] Create distinct admin and partner Better Auth configurations.
- [x] Remove the admin plugin and `adminClient` from the partner app.
- [x] Disable partner-domain admin user enumeration and impersonation routes.
- [ ] If impersonation is required, require a dedicated permission, recent MFA, ticket/reason, short expiry, visible banner, and immutable start/stop/action audit.
- [x] Add tests proving admin-only endpoints are absent from the partner domain.

### Verify partner identity and control signup abuse

- [ ] Require verified email before KYC or authenticated partner operations.
- [ ] Add verified phone before activation where business/legal review requires it.
- [x] Disable raw generic signup in favour of one atomic partner-registration workflow.
- [x] Add Turnstile to registration.
- [ ] Apply independent IP, email, device, and ASN throttles to the actual registration action.
- [ ] Clean abandoned and unverified accounts after a defined retention period.
- [x] Return stable public error codes rather than raw `Error.message` values.
- [x] Prevent account/email enumeration.

### Harden sessions and password reset

- [x] Set `verification.storeIdentifier` to hashed storage.
- [x] Set `revokeSessionsOnPasswordReset: true`.
- [ ] Define short staff idle and absolute session limits.
- [ ] Add session/device management and “revoke all sessions” UI.
- [ ] Notify users of password resets and security-sensitive account changes.
- [x] Scrub reset tokens from browser URLs immediately.
- [x] Apply `Referrer-Policy: no-referrer` to reset pages.
- [ ] Add breached-password checking.
- [ ] Test reset-token expiry, single use, session revocation, and enumeration resistance.

### Replace staff password provisioning

- [ ] Replace the admin seed script with a verified, expiring invitation or break-glass flow.
- [x] Never accept passwords through command-line arguments.
- [x] Refuse existing accounts by default during admin bootstrap.
- [x] Reject partner-linked identities during staff creation.
- [x] Revoke existing sessions before any controlled promotion.
- [x] Replace returned temporary passwords with single-use activation links.
- [ ] Require first-login password setup and MFA enrolment.
- [ ] Record immutable audit evidence for staff creation and promotion.
- [ ] Enforce at least one active administrator transactionally.

### Add least-privilege application authorization

- [ ] Define sales, operations, finance, compliance, support, administrator, and break-glass roles.
- [ ] Create a permission matrix for every page, action, data field, and export.
- [ ] Enforce assignment/ownership-based access to leads and cases.
- [ ] Mask commercial and KYC fields by role.
- [ ] Require recent MFA for roles, bans, password resets, KYC decisions, payouts, exports, and sensitive data reveal.
- [ ] Add maker-checker approval for KYC and financial actions.
- [ ] Add deny-by-default authorization tests for every server action and route.

## P1 — Privacy, KYC, and data governance

### Protect high-risk personal data

- [ ] Build a data inventory and classification covering leads, authentication, KYC, banking, audit, logs, email, analytics, backups, and vendors.
- [ ] Encrypt PAN, GST, address, account holder, account number, and other high-risk fields using envelope encryption and managed keys.
- [ ] Use blind indexes only where lookup is required.
- [ ] Mask high-risk fields by default in admin and partner UIs.
- [ ] Require step-up authorization to reveal full values.
- [ ] Audit every reveal, download, and export.
- [ ] Minimise server-component-to-client payloads and explicitly select required columns.
- [ ] Verify and document data residency and cross-border processing.

### Replace full Aadhaar collection

- [ ] Obtain legal review of the lawful basis and necessity for Aadhaar collection.
- [ ] Prefer UIDAI masked Aadhaar or digitally signed paperless offline e-KYC.
- [ ] Avoid persisting the full Aadhaar number.
- [ ] Validate UIDAI digital signatures where offline e-KYC is used.
- [ ] Reject or redact unmasked Aadhaar documents where legally and operationally appropriate.
- [ ] Add a specific notice, purpose, consent, retention, and access policy for Aadhaar-related data.

### Implement consent and rights workflows

- [ ] Replace hard-coded consent dates with versioned, immutable policy records.
- [ ] Store exact notice hash/text, purposes, actor, timestamp, source, and relevant request context.
- [ ] Separate necessary-service consent from optional marketing purposes.
- [ ] Implement withdrawal and downstream suppression.
- [ ] Define a legally reviewed bulk/CSV consent model with per-record provenance.
- [ ] Implement authenticated access, correction, deletion, grievance, and consent-withdrawal requests.
- [ ] Track request owner, identity verification, deadline, decision, fulfilment, and evidence.
- [ ] Add retention, deletion, suppression, legal hold, and processor-deletion jobs.
- [ ] Maintain processor/vendor agreements and a current data-flow map.
- [ ] Complete DPDP and RBI/LSP/DLA applicability review with counsel and lender partners.

### Build a hostile-file KYC pipeline

- [x] Enforce upload size at the edge before multipart buffering.
- [ ] Use streaming/direct upload rather than materialising an untrusted large request.
- [ ] Store new files in a quarantine bucket/state.
- [ ] Run malware scanning, safe decoder validation, and CDR/preview conversion where appropriate.
- [ ] Record SHA-256/ETag, scanner version, scan result, and timestamp.
- [ ] Make verified scan state a database requirement for KYC approval.
- [ ] Serve only safe generated previews where possible.
- [x] Add exact Origin/Fetch Metadata or CSRF-token checks to upload endpoints.
- [ ] Audit every KYC upload, replacement, read, download, scan, approval, rejection, and deletion.
- [ ] Move object deletion to a Queue with retries and a DLQ.
- [ ] Add a periodic database-to-R2 orphan and missing-object reconciler.

### Strengthen audit evidence

- [ ] Give runtime applications a restricted audit-writer capability rather than owner access.
- [ ] Prevent runtime `TRUNCATE`, DDL, trigger disablement, and arbitrary audit inserts.
- [ ] Add authentication, session, reset, role, impersonation, KYC-view, export, consent, and privacy-rights events.
- [ ] Use an outbox/hook so sensitive changes cannot succeed without corresponding audit evidence.
- [ ] Export security events to an external append-only/WORM store or SIEM.
- [ ] Define audit retention, pseudonymisation, access, monitoring, and legal-hold policy.

## P1 — Financial integrity

- [ ] Assign a finance-domain owner.
- [ ] Define a database-enforced loan/lead state machine and permitted transitions.
- [ ] Require disbursed amount/date for disbursed status.
- [ ] Prevent payout greater than approved revenue unless an explicit adjustment is authorised.
- [ ] Prevent contradictory status and timestamp combinations.
- [ ] Replace duplicate financial facts across `loan_cases` and `partner_payouts` with one canonical immutable ledger.
- [ ] Require source loan/case references for ledger entries.
- [ ] Add idempotency keys and unique constraints to every financial mutation.
- [ ] Represent corrections as reversal/adjustment entries rather than editing history.
- [ ] Add maker-checker approval for payouts and exceptional transitions.
- [ ] Build daily automated reconciliation and exception reporting.
- [ ] Add tests for retries, concurrency, overpayment, reversal, terminal states, and ledger/MIS consistency.

## P1 — CI/CD, staging, and migrations

### Build isolated environments

- [ ] Create isolated development, preview, staging, and production Workers.
- [ ] Create separate database branches/databases, R2 buckets, Hyperdrives, rate-limit namespaces, secrets, and domains for each environment.
- [ ] Prevent preview/staging from sending real email or accessing production data.
- [x] Add complete `.env.example` and `.dev.vars.example` files without real credentials.
- [x] Correct the documented Hyperdrive local-override variable prefix.

### Build once and promote the tested artifact

- [ ] Split OpenNext build, Wrangler validation, version upload, and traffic promotion into separate steps.
- [x] Build once with exact environment inputs.
- [x] Run a secret scan, bundle-size check, Wrangler dry run, and source-map inspection.
- [ ] Run workerd/preview smoke and integration tests against the artifact.
- [ ] Generate a checksum, SBOM, provenance, commit/version metadata, and attestation.
- [x] Promote the same immutable artifact to production without rebuilding.
- [ ] Record the previous Worker version for one-command rollback.

### Adopt safe database migrations

- [ ] Enforce expand/migrate/contract across separate releases.
- [ ] Test every migration on a recent production clone.
- [ ] Set and review `lock_timeout` and `statement_timeout`.
- [ ] Use online/concurrent index and constraint-validation patterns.
- [ ] Capture and verify a restorable checkpoint before migration.
- [ ] Test old and new application versions against the expanded schema.
- [ ] Do not contract schema while any rollback-eligible code still depends on it.
- [ ] Add post-migration data-integrity and compatibility checks.

### Add release verification and rollback

- [x] Add health endpoints for website, admin, and partners.
- [x] Separate public liveness from protected readiness.
- [ ] Smoke-test version/preview URLs before promotion.
- [ ] Verify login, role checks, lead creation, partner access, KYC, and email Queue after promotion.
- [x] Stop or roll back promotion on any failed critical check.
- [x] Document Worker rollback limitations after database/resource changes.
- [ ] Add a production change log with commit, migration, artifact, approvers, and rollback version.

## P1 — Testing and quality gates

### Test architecture

- [x] Add a `test` task to Turbo and every relevant package.
- [x] Make the root test command discover both central and colocated tests.
- [ ] Add domain unit tests for money, state transitions, consent, KYC completeness, and authorization.
- [ ] Add component interaction tests for forms, pending states, errors, and success announcements.
- [ ] Add Postgres-backed integration tests for transactions, constraints, roles, migrations, and concurrency.
- [ ] Add Workers-runtime tests using `@cloudflare/vitest-pool-workers`.
- [ ] Add Playwright E2E for public conversion, auth, partner onboarding, KYC, admin, finance, and recovery workflows.
- [ ] Add axe accessibility scans and visual regression.
- [ ] Add load tests for lead submission, registration, CSV import, KYC upload, search, MIS, and payout operations.
- [ ] Add mutation tests for money and authorization logic.
- [ ] Establish critical-path coverage thresholds without optimising only for a global percentage.

### Static and supply-chain gates

- [x] Add type-aware TypeScript ESLint rules and floating-promise checks.
- [x] Add React Hooks and JSX accessibility linting to shared React packages.
- [ ] Run lint/typecheck/tests for affected packages in pre-push or fast local checks.
- [x] Add Renovate or Dependabot with grouped, scheduled updates.
- [ ] Add CodeQL/SAST, dependency review, committed secret scanning, license policy, and SBOM generation.
- [ ] Add OpenSSF Scorecard/SCM policy checks where applicable.
- [ ] Restrict allowed Actions and verify full-SHA pinning.
- [ ] Add provenance and artifact attestation verification before promotion.

## P1 — Reliability, email, and observability

### Make transactional email durable

- [ ] Send email through a Queue rather than relying only on `ctx.waitUntil`.
- [ ] Add idempotency keys, bounded exponential retry, and a DLQ.
- [ ] Persist provider message ID and delivery state.
- [ ] Process delivery, bounce, complaint, and suppression webhooks.
- [ ] Alert on failure rate, queue age, retries, and DLQ growth.
- [ ] Verify SPF, DKIM, DMARC, sender-domain alignment, and corporate mailbox ownership.
- [ ] Send minimal PII in internal alerts; link to the protected dashboard.
- [ ] Redact recipient, subject, tokens, KYC values, and raw provider bodies from logs.

### Establish observability and incident response

- [ ] Define service and workflow SLOs for availability, lead success, auth, KYC, email, database latency, and payouts.
- [ ] Define alert thresholds, severity, owner, escalation, and runbook for each SLO.
- [ ] Add external synthetics for all domains and critical workflows.
- [ ] Add structured correlation/request IDs across Worker, database, Queue, and email events.
- [ ] Define log redaction, retention, access, export, and deletion policy.
- [ ] Add dashboards for error rate, latency, Hyperdrive status, database connections, Queue/DLQ, KYC scans, and deployment health.
- [ ] Add commit/version metadata to every Worker deployment and log event.
- [ ] Write incident, rollback, credential rotation, database recovery, and KYC recovery runbooks.
- [ ] Schedule quarterly incident and disaster-recovery exercises.

## P1 — Frontend, accessibility, and product correctness

### Make public conversion resilient

- [x] Render a functional enquiry form or useful server fallback in prerendered HTML.
- [x] Resolve product query parameters server-side rather than using a null Suspense fallback.
- [x] Ensure a meaningful no-JavaScript state is present in generated HTML.
- [x] Treat UTM metadata as optional: truncate/drop invalid values without rejecting a lead.
- [x] Store UTM data safely with a TTL.
- [x] Model first-touch and last-touch attribution separately.
- [x] Guard all `localStorage` access.
- [ ] Add E2E tests for oversized/corrupt UTM values, blocked storage, disabled JavaScript, slow JavaScript, and network failure.

### Make mutations and forms truthful

- [ ] Return typed success, form-error, and field-error states from every admin/partner mutation.
- [ ] Surface action results through `useActionState` or an equivalent pattern.
- [ ] Announce success and failure with accessible live regions.
- [ ] Prevent silent no-ops for stale assignees, missing records, and validation errors.
- [x] Wrap transport calls in `try/catch/finally` and reliably clear pending state.
- [x] Navigate after sign-out only when sign-out succeeds.
- [x] Add root-level error boundaries to every app.
- [x] Map public registration failures to stable messages and log internal details server-side.

### Accessibility

- [x] Replace failing `navy-400`, `navy-300`, and translucent footer text combinations with WCAG AA semantic text tokens.
- [ ] Add automated contrast and axe checks.
- [x] Label the lead note textarea, KYC rejection textarea, team role selector, CSV file input, and any other unlabelled controls.
- [x] Add skip navigation, main focus targets, and `aria-current` to authenticated apps.
- [x] Add route/entity-specific document titles.
- [x] Add `aria-live`, `aria-busy`, pending text, and focus management for success/progress/state changes.
- [x] Replace the infinite partner marquee with a static list or add pause and reduced-motion behaviour.
- [ ] Test keyboard-only, screen-reader, zoom/reflow, reduced-motion, error, and loading workflows.

### SEO and content metadata

- [x] Add canonical URLs to all intended public pages.
- [x] Generate complete descriptions without mid-word truncation.
- [x] Add article Open Graph metadata, author/publication information, canonical URLs, images, and article JSON-LD.
- [x] Add Organization/FinancialService and breadcrumb structured data.
- [x] Apply page-level `noindex,nofollow` to login, forgot-password, reset-password, dashboard, and private routes.
- [x] Review partner sitemap/robots behaviour for intended public pages.

## P2 — Performance and scalability

- [x] Replace monolithic `radix-ui` imports with direct packages/subpath exports.
- [ ] Add per-route and shared JavaScript bundle budgets to CI.
- [x] Move compact product slug/name references to `@truelend/reference`.
- [x] Prevent rich product copy and icon mappings from entering forms that need only slugs.
- [x] Split form schemas so unrelated content is not bundled.
- [x] Precompile blog frontmatter so `gray-matter` and direct `eval` do not enter the Worker bundle.
- [ ] Add real-user Core Web Vitals monitoring and performance regression budgets.
- [ ] Paginate partner, payout, document, note, and case collections.
- [ ] Replace deep offset pagination with keyset pagination where appropriate.
- [ ] Add trigram/search indexes for `%ILIKE%` lead search.
- [ ] Replace correlated MIS/partner subqueries with grouped joins or maintained summaries.
- [ ] Capture `EXPLAIN (ANALYZE, BUFFERS)` baselines for critical queries.
- [ ] Define database query-count, latency, and connection budgets.
- [ ] Revisit per-request `max: 5` and unclosed RSC clients using production Hyperdrive/Neon metrics.

## P2 — Infrastructure as code and operational maturity

- [ ] Codify Workers, Hyperdrive, R2, DNS, WAF, Access, rate limits, secrets metadata, alerts, GitHub controls, database roles, and backup policies in Terraform/Pulumi.
- [ ] Add drift detection and reviewed infrastructure plans.
- [ ] Define WAF, bot, body-size, abuse, and API protections for public, auth, CSV, and upload endpoints.
- [x] Set `workers_dev: false` where alternate public access is not required.
- [ ] Define KYC bucket lifecycle, retention, versioning/recovery, and event-notification policy.
- [ ] Add staging and production cost/usage budgets and alerts.
- [ ] Complete annual vendor, processor, IAM, token-scope, and data-residency reviews.
- [ ] Conduct an independent authenticated penetration test after P0/P1 remediation.
- [ ] Verify against OWASP ASVS 5.0 Level 2, with selected Level 3 controls for admin, auth, KYC, and finance.
- [ ] Adopt NIST SSDF as the secure-development lifecycle baseline.

## P2 — Documentation and developer experience

- [x] Rewrite `README.md` to describe all three apps, authentication, tests, database, R2, Queues, and actual deployment flow.
- [x] Remove references to nonexistent `schema.users` and obsolete architecture.
- [x] Rewrite `CLAUDE.md` to require protected branches and approved releases rather than direct production pushes.
- [x] Document one-command local bootstrap with isolated local/test data.
- [x] Add complete environment and binding matrices.
- [x] Document architecture, trust boundaries, data flows, threat models, and privilege matrix.
- [x] Document migrations, staging, release approval, smoke tests, rollback, restore, and credential rotation.
- [x] Add `CONTRIBUTING.md`, `SECURITY.md`, `CODEOWNERS`, architecture decision records, and runbook index.
- [x] Pin the supported Node version consistently between `.nvmrc`, `package.json`, CI, and documentation.
- [x] Pin or intentionally manage the CI runner image.
- [x] Correct Turbo outputs so `next build` cannot cache stale `.open-next` artifacts.
- [ ] Define ownership and review cadence for product data, legal copy, security controls, dependencies, and infrastructure.

## P3 — Continuous improvement

- [ ] Add preview environments per pull request when cost-effective.
- [ ] Add remote Turbo caching after access controls and cache trust are defined.
- [ ] Add automated content freshness reminders and rate-source ingestion.
- [ ] Add visual performance dashboards and product funnel monitoring without collecting unnecessary personal data.
- [ ] Run quarterly access reviews, restore drills, threat-model updates, dependency exercises, and incident simulations.
- [ ] Run an annual independent security and privacy assessment.

## Production-readiness exit criteria

- [ ] Every P0 item is closed and verified in production.
- [ ] Every P1 item is closed, or a time-bounded exception has documented owner, compensating control, approval, and expiry.
- [ ] No runtime database role is an owner or superuser.
- [ ] Public website has no KYC storage capability.
- [ ] Admin requires Access, MFA, and least-privilege application authorization.
- [ ] Critical security, financial, KYC, consent, and recovery workflows have automated integration/E2E coverage.
- [ ] Production deploys promote a tested immutable artifact through protected approval.
- [ ] Database and R2 recovery exercises meet approved RPO/RTO.
- [ ] Counsel has approved privacy, terms, consent, Aadhaar/KYC, DPDP, and RBI/LSP/DLA applicability.
- [ ] Public content contains no placeholder, unsupported, expired, or interim claims.
- [ ] Independent penetration testing has no unresolved critical/high finding.
- [ ] OWASP ASVS and NIST SSDF evidence is recorded and reviewed.

## Verification commands

Run these from the repository root before requesting review:

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm cf:validate
pnpm lint
pnpm typecheck
pnpm test
pnpm audit --audit-level high
pnpm build
```

Each production change must additionally pass the OpenNext/Workers-runtime tests, artifact secret scan, staging smoke tests, migration compatibility checks, production synthetics, and documented rollback/recovery verification added by this backlog.
