# Bug Candidates

**This is a list of unverified leads, not a defect list.** Every entry below was found by reading source while designing `TEST_PLAN.md` — none were confirmed by an executing test unless explicitly marked otherwise. One high-confidence entry (`lib/kyc-actions.ts`'s `submitForReview`, previously called "the most concrete real bug candidate in the whole list") turned out to be a false positive once a real test exercised it. Another (`lib/signup-actions.ts`'s `'existing'`-outcome silent fallthrough) was confirmed true by an executing test. Treat every other, still-unmarked entry the same way both of these started out: plausible, not proven, until something actually runs the code path. None have been fixed; per the refactor mandate, characterization tests pin current behavior as-is, and any entry that survives being exercised gets fixed separately, later, outside this refactor.

Organized by app, then file. Severity is my read, not a formal rating.

## apps/admin

### `lib/auth.ts`

- **Two different redirect targets for analogous denials**: `requireStaff` sends any non-staff session to `/login`; `requireAdmin` sends a valid _staff_ (employee) session that lacks admin rights to `/` instead. Easy to regress silently.
- **`getMutationContext` never redirects** — a denied/absent session just resolves as `{user: null}`, relying on every call site to remember `if (!user) redirect('/login')`. A real footgun if any action forgets the check.
- Local-dev password-reset bypass checks `hostname === 'localhost'` by exact string — `127.0.0.1`, `[::1]`, or any other loopback hostname fails the check and hits the fail-closed throw even though it's effectively local dev.
- `sendResetPassword` throws the identical generic message whether the email was silently skipped (misconfiguration) or a real send genuinely failed after retrying (provider outage) — operationally very different situations, indistinguishable by error text.

### `lib/lead-actions.ts` / `lib/loan-actions.ts`

- **Auth-denial UX is inconsistent across sibling admin action files**: `lead-actions.ts`/`loan-actions.ts` `redirect('/login')` on denial; `partner-actions.ts`/`team-actions.ts` return an inline `{error: 'Not authorized.'}` for the conceptually identical "no valid staff session" case.
- `addLeadNoteAction` only revalidates `/leads/{id}`; `updateLeadPipelineAction` revalidates both `/leads/{id}` and `/leads`. Possibly intentional (notes don't show on the list view) but worth confirming.
- `addLeadNoteAction`'s audit log uses `note?.id` — if `insert().returning()` ever resolves empty, the audit row silently gets `entityId: undefined` instead of failing loudly.
- `createLoanCaseAction` has an `if (!newId) return {error: UNKNOWN_CREATE_OUTCOME}` branch after the try/catch/finally that appears unreachable under the current control flow — dead code, harmless but worth a look.

### `lib/partner-actions.ts`

- `revokePartnerAction` sends no email notification, while `approvePartnerAction` and `rejectPartnerAction` both do — a partner whose verification is revoked isn't told.
- `updatePartnerDetailsAction` only resets an already-verified partner to `pending` when a field in `partnerReviewSensitiveFields` changes — phone and date-of-birth are editable on a verified partner without ever triggering re-review, despite being identifying fields.
- `rejectPartnerAction` stores the rejecting admin's id/timestamp in the `verifiedBy`/`verifiedAt` columns (named for the approval flow) — confusing for anyone reading the table directly without checking `status`.

### `lib/team-actions.ts`

- `createUserAction`'s denial message is `'Not authorized'` (no trailing period); every other action in the same file uses `'Not authorized.'` (with period) — a copy-paste inconsistency a naive "fix" could silently regress.
- **`sendPasswordResetAction` has no self-target guard** — every other mutating action in this file (`setRoleAction`, `setBanAction`, `removeUserAction`) explicitly refuses `userId === me.id`. An admin can revoke their own active sessions and email themselves a reset link through this one path.
- `setRoleAction` always writes + audit-logs even when the requested role equals the current one; `setBanAction` explicitly short-circuits on a no-op via `planBanMutation.changed`. Same file, two different idempotency treatments for structurally similar actions.
- This file re-implements "resolve current user" via `createAuthContext()+headers()+getSession()` instead of reusing `lib/auth.ts`'s `getMutationContext` — a duplicated auth-resolution path that could drift from `getMutationContext`'s semantics later.

### `app/api/auth/[...all]/route.ts`

- No catch block (only finally) — an `auth.handler` failure surfaces as Next's generic 500 instead of a controlled JSON error, inconsistent with the rest of the API-routes cluster's defensive style.
- Duplicates the `createDb` + `createAdminAuth` + cleanup-on-construction-failure pattern that already exists as `createAuthContext()` in `lib/auth.ts`, instead of calling it — two copies of the same contract to keep in sync by hand.

### `app/api/health/ready/route.ts`

- DB ping failures are swallowed by a bare `catch { db = "error" }` with **zero logging** — an on-call engineer sees `status:error` with no diagnostic detail about why.

### `app/api/kyc/[...key]/route.ts`

- **No catch block anywhere (only try/finally)** — any unexpected exception bypasses the route's own branded `errorPage()` HTML entirely, defeating the file's own stated design intent ("readable page, not a raw text body"). Its sibling `kyc/upload/route.ts` has a full catch-all. Real gap between two closely related routes.
- The admin-only role check (`role !== 'admin'`) excludes `employee`, while `lib/auth.ts`'s general staff guard treats admin and employee as equally privileged elsewhere. Worth confirming this is a deliberate "more sensitive than other staff actions" call, not an oversight.
- `obj.body` is cast directly `as BodyInit` with only an `if (!obj)` guard — a null/undefined body on an otherwise-truthy R2 result would silently construct an empty response rather than erroring.

### `app/api/kyc/upload/route.ts` (admin)

- The content-length pre-check is a fast-path optimization only, not a real limit — an inaccurate/absent header (coerced to `0`) lets an arbitrarily large body get fully buffered by `req.formData()` before the real size check runs. The "5MB cap" isn't enforced against actual parse-time memory use.
- If `env.BUCKET.put()` itself throws, the catch block still unconditionally calls `.delete()` on a key that may never have been written (harmless if R2 delete is idempotent on a missing key, but the code infers "written" from flags rather than confirming it).
- Uploaded JPEGs get a `.jpeg` extension, not the more common `.jpg` — worth a grep during test-writing to confirm nothing else in the codebase assumes `.jpg`.

## apps/partners

### `middleware.ts`

- No `?next=`/return-to param on the `/login` redirect — a signed-out partner following a deep link (e.g. an emailed `/leads/123` URL) lands at bare `/login` with no way back afterward. May be intentional.

### `lib/auth.ts`

- `sendResetPassword`'s dev/localhost check only runs inside the `result.ok && result.skipped` branch — if `BETTER_AUTH_URL` is malformed/empty, `new URL(...)` throws a **raw, unhandled `TypeError`** instead of the intended, uniformly-worded fail-closed error used everywhere else in the function.
- `requirePartnerSession` (redirect-based) and `withPartnerRequest` (silent `partner: null`) implement "no session → skip partner lookup" two structurally different ways for the same underlying guard — a future edit to one is easy to forget applying to the other.

### `lib/kyc-actions.ts`

- ~~`submitForReview` has no `status === 'verified'` guard...`~~ **RETRACTED — does not reproduce.** A real executing characterization test (`apps/partners/test/kyc-actions.test.ts`) shows a verified partner cannot flip back to `pending`: `evaluatePartnerApplication(...).canSubmit`is`editable && isComplete`, and `isKycEditable`returns`false`unconditionally for`status === 'verified'`, so `canSubmit`is always`false`for a verified partner regardless of document completeness —`submitForReview` returns the same "incomplete"-shaped error, no DB write, every time. There IS a real (much smaller) inconsistency: the error message ("...documents changed. Review the checklist...") is misleading for this case, since nothing about the checklist is actually incomplete — the partner is simply locked because they're already verified. Left as a documentation nit, not a data-integrity issue. This is exactly the kind of read-derived false positive flagged as likely up front — caught by writing the test, not by re-reading the source.
- The "no session" and "no partner row" branches return the identical `'Please sign in again.'` message across all three functions, even though "never registered" and "session expired" are materially different situations for the user.

### `lib/profile-actions.ts`

- Unlike `kyc-actions.ts` (locks bank/PAN/nominee fields via `isKycEditable`) and `lead-actions.ts` (gates on verified status), this file applies **zero status gating** — a partner mid-review or already verified can change name/phone freely at any time.

### `lib/signup-actions.ts`

- **CONFIRMED by an executing test** (`apps/partners/test/signup-actions.test.ts`): **`registrationAccountDecision`'s `'existing'` outcome has no explicit branch** — a signed-in user who already has a partner profile falls through the same path as a brand-new `'created'` registration (redirect to `/dashboard`, no error, no distinguishing signal), purely because the code checks `=== 'ineligible'` explicitly but never checks `=== 'existing'`. Looks like an unintentional gap in the switch rather than deliberate idempotency, especially since the analogous `kyc-actions.ts` idempotent cases _are_ handled with named branches. The characterization test pins this current (silent-fallthrough) behavior as-is, per the refactor mandate — not fixed here.

### `app/api/kyc/upload/route.ts` (partners)

- Two different 403 messages for the same underlying "partner profile not found" condition depending on timing: the pre-check says _"Your Referral Partner profile could not be found."_, the in-transaction recheck says _"No Referral Partner profile"_.
- Copy says "JPG" in user-facing text, but the stored file extension for that MIME type is `.jpeg` — cosmetic mismatch between copy and the real asset naming.
- `uploadedKey` is assigned before `env.BUCKET.put()` is confirmed to succeed — if `put()` itself throws, the catch still attempts a defensive delete of a key that may never have been written (harmless, but the bookkeeping is optimistic ahead of confirmation).
- No shared error-envelope convention across this app's sibling API routes: this route uses `{error, uncertain?}`, the auth route uses `{code, error}`, the health routes use `{status}`.
- The Content-Length pre-check allows up to ~6MB through before the authoritative 5MB `file.size` check runs later — a "soft" 6MB gate vs. a "hard" 5MB limit, presumably intentional multipart-overhead headroom but a real dual-threshold quirk.

### `app/api/auth/[...all]/route.ts` (partners)

- The 404 envelope here (`{code, error}`) differs from `kyc/upload`'s (`{error}` only) and the health routes' (`{status}`) — no shared convention.
- `EDGE_LIMITED_AUTH_PATHS` includes `/api/auth/sign-up/email`, but on the partners app that exact path is already unconditionally blocked (404) before the rate limiter is ever reached — that rate-limit entry looks dead for this app. By contrast, **admin's equivalent route doesn't call the same allow-list check at all**, so admin's `/api/auth/sign-up/email` _does_ reach its rate limiter. Asymmetry between two otherwise-parallel routes worth confirming is intentional.

### `app/api/health/ready/route.ts` (partners)

- When `HEALTHCHECK_SECRET` is unset, the response is 503 (not 401) — an operator who forgot to configure the secret sees a generic "service down" instead of a distinct "auth misconfigured" signal.
- Checks db, registration-schema, auth-config, _and_ Turnstile-config (4 sub-checks) vs. admin's equivalent route, which only checks db + auth (2). May be intentional (admin doesn't take partner self-registration traffic or use Turnstile) but is a real capability gap between two otherwise-parallel routes.
- `pingPartnerRegistrationSchema` still runs even when the DB ping already failed — a redundant round-trip against a connection already known bad.

## apps/website

### `middleware.ts`

- **The 308 redirect target is built from the raw, unauthenticated `Host` header** with no allowlist check against the site's known canonical domain(s) — if the Worker is ever reachable with a spoofed `Host`, the redirect `Location` is constructed from attacker-controlled input.
- `startsWith("www.")` is case-sensitive — a mixed-case `WWW.` host bypasses the canonical-host redirect entirely, undermining the stated goal of avoiding duplicate-content indexing.
- A bare `"www."` host (edge case, likely unreachable via real DNS but possible via a forged header) produces an empty `url.host`, which looks like it would yield a broken redirect rather than any explicit handling.

### `lib/lead-actions.ts` (website)

- The partner-lookup SQL only excludes `status='rejected'` — any other status, including a not-yet-approved/pending partner, still resolves to a `partnerId` and earns referral credit. Looks like it should likely require an explicit approved-equivalent status.
- **CONFIRMED by an executing test** (`apps/website/test/lead-actions.test.ts`): `submissionMayHaveBeenStored` is set unconditionally right before `db.transaction()` is called, not based on whether the transaction actually reached the database — a simulated immediate transaction failure (a stand-in for a connection error before any statement executes) still produces "...if you may have already sent it," even though nothing was ever sent. The characterization test pins this current (over-cautious-but-misleading) behavior as-is, per the refactor mandate — not fixed here.
- `TURNSTILE_ACTIONS[parsed.data.kind]!` uses a non-null assertion against a plain object keyed by the four current `kind`s — a new `kind` added to the schema without a matching entry here would silently pass `expectedAction: undefined` at runtime with no compile-time enforcement tying the two together.
- `db.$client.end()` is only scheduled as a best-effort background task, never awaited before the response — a cleanup failure is only ever logged, never surfaced or retried (same "best effort" pattern as elsewhere in the codebase, not unique to this file).
- `expectedHostname` passed to `verifyTurnstile` is taken directly from the request's `Host` header — the same header `middleware.ts` also trusts unvalidated — so the Turnstile hostname check is partly grounded in client-supplied input rather than a server-known canonical hostname.

### `app/api/health/ready/route.ts` (website)

- **Turnstile readiness mixes a Cloudflare env binding with a raw `process.env` read** (`env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY`), and doesn't even import the shared `hasConfiguredValues` helper that both sibling apps' equivalent routes use exclusively from `env`. Suspicious given the otherwise-identical shape of the three apps' ready routes.
- `createDb(...)` is called _before_ the try block — a synchronous/rejected construction failure (bad connection string, missing binding) escapes uncaught instead of degrading to the structured `{status:"error", ...}` response a `ping()` failure produces, and the cleanup task never runs in that case. (Same shape exists in admin/partners' equivalents too — may be a systemic, accepted tradeoff rather than website-specific.)
- The bare `catch { db = "error" }` around `ping()` swallows the error with zero logging — no diagnostic trail beyond the boolean flag.
- The unauthorized-path response body (`{status:"error"}`) omits `service`/`timestamp`, present on every other branch despite all branches nominally sharing one response shape.

---

## Design inconsistencies (not bugs, but worth your attention)

- **Testability gap within `apps/admin/lib/`**: `team-mutation-policy.ts`, `partner-review-policy.ts`, and `partner-ledger.ts` were all deliberately extracted into pure, zero-mock functions with their own test files. `lib/auth.ts`'s role-gating logic wasn't — it's inline and wired directly to 5 module-level imports, so testing it requires `mock.module()` where the extracted siblings need nothing. Not a functional defect, but an inconsistency in how testable this file is relative to its neighbors.
- **No shared error-envelope convention** across any app's sibling API routes — every route invents its own JSON error shape (`{error}`, `{code, error}`, `{status}`, `{error, uncertain}`).
