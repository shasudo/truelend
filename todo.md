# TrueLend — Pending Work

Living checklist. Tick items off as they land; add new ones with enough
context to pick up cold. (MoM scope tracked here without dates, per decision.)

## UX / workflow audit (2026-07-13)

Full end-to-end review (52 confirmed findings). **High-severity code fixes done:**

- [x] **Shared `SubmitButton`** (`packages/ui`, useFormStatus) — pending/disabled + optional `confirm`. Wired into every admin mutation (leads, loan cases,
      partners approve/reject/payout, team role/ban) and the partner "Submit
      application" — kills double-submit dup writes (incl. duplicate payout rows).
- [x] **Approve/Reject/Ban confirmations** — `window.confirm` before the
      irreversible partner-email and teammate-ban actions. Reject reason now
      `required`.
- [x] **Turnstile submit gate** — token tracked in state; submit disabled until
      solved + "Verifying you're human…" hint (fixes the self-blaming error).
- [x] **Mobile nav** — both dashboards: desktop rail `hidden lg:flex` + a Radix
      drawer top bar below lg. Sign-out now has a pending state. Partner nav
      labels aligned to page titles; admin "Partners" link is now admin-only.
- [x] **Password recovery** (high) — DONE. better-auth reset wired end to end:
      `sendResetPassword` in `packages/auth` (sender injected by each app via
      `authOptions(env)`), `sendPasswordReset` template in `@truelend/email`,
      `/forgot-password` + `/reset-password` pages + forms in admin AND partners,
      "Forgot your password?" on both logins, admin middleware exempts the new
      routes. **Delivers only once Resend is active** (env-gated like all email).
- [ ] **Placeholder-as-real content** (high) — needs YOUR real values, can't be
      invented: contact phone/WhatsApp/email (`content/site.ts`), the stats band
      figures (`stats-band.tsx`), "Our lending partners" bank claim, and the
      "interim / pending legal review" note on privacy/terms. Tracked under
      "Real content" / "Real contact details" / "Legal copy" below.
- [x] **Medium/low polish sweep** — DONE across all three apps (loading/empty/
      error states, loan-case edit no longer rewinds lead status, verified-partner
      revoke, MIS gated to admins, Approve gated on submission+docs, inert
      pagination, loan-case filters, KYC-upload + consent a11y, card-in-card
      success, Kind→Channel, editable partner profile, and more).
- [x] **Admin action feedback (#14)** — expired-session clicks redirect to /login
      instead of a silent no-op; native constraints (required/min/maxLength) close
      the blank/0/over-long silent-ignore traps; create-user echoes credentials.
- [ ] **Still owner-blocked (need real values, can't invent)** — real contact
      phone/WhatsApp/email (`content/site.ts`), real borrower stats
      (`stats-band.tsx`), counsel-approved privacy/terms text, and the Turnstile
      env-pair coupling. Tracked under "Real content" / "Legal copy" below.

## Website — before go-live

- [ ] **Real content from LinchPin/TrueLend** — every product description, rate
      table (`apps/website/content/products.ts`), stats-band figures
      (`components/stats-band.tsx`) and About copy is realistic placeholder.
      Rate data is flagged by `RATES_ARE_PLACEHOLDER` in `content/products.ts`.
- [ ] **Real contact details** — phone, WhatsApp, email, address in
      `apps/website/content/site.ts` are placeholders.
- [x] **Provision infra** — `wrangler login` (shathwik@linchpinsoftsolution.com),
      R2 bucket `truelend`, Neon Postgres, Hyperdrive config
      `88ae362ffaea4695b72a99731389a543` (id in wrangler.jsonc). Credentials live
      in gitignored `packages/db/.env` (direct endpoint, migrations) and
      `apps/website/.env` (pooled endpoint for local dev/preview via
      `WRANGLER_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE`). Note: wrangler
      is workspace-local — `pnpm exec wrangler` from `apps/website`. Account
      also has an unused `truelend-files` bucket from June.
- [ ] **Rotate the Neon password** — the connection string was shared in chat;
      reset it in the Neon dashboard, then update both `.env` files and
      `pnpm exec wrangler hyperdrive update` with the new string.
- [x] **Apply DB migration** — migration 0000 applied to Neon; insert/select
      round-trip verified; workerd preview health reports `db: ok` through the
      Hyperdrive binding.
- [x] **First production deploy** — live at
      https://truelend-website.truelend.workers.dev (workers.dev subdomain
      `truelend` registered account-wide). Health reports `db: ok` through
      Hyperdrive; all routes verified 200.
- [ ] **Browser end-to-end form test** — DB insert path is verified via SQL and
      the health check; still submit all 4 forms in a browser once deployed and
      confirm rows land with correct `kind` + UTM values.
- [x] **Turnstile keys** — widget created (hostnames: workers.dev + localhost);
      site key in `apps/website/.env` (build-time), secret in `.dev.vars` +
      `wrangler secret put TURNSTILE_SECRET_KEY`. Deployed and verified in prod
      chunks. Remember to add `truelend.in` to the widget's hostnames when the
      custom domain goes live.
- [ ] **Custom domain** — site assumes `https://truelend.in`
      (`content/site.ts`, sitemap, OG URLs). Attach the real domain to the
      Worker and update if different.
- [ ] **Legal copy** — privacy/terms are interim text; replace with
      counsel-approved versions before campaigns run.
- [ ] **Partner-bank logos** — partner strip is typographic; swap in licensed
      logo assets when permissions exist (`components/partner-strip.tsx`).
- [ ] **Analytics** — none wired. Cloudflare Web Analytics is the zero-config
      option; Meta pixel etc. only alongside campaign work.
- [~] **Email (Resend)** — wired but INACTIVE until configured. `@truelend/email` + triggers are deployed: new-lead alerts to the team (website + partner
  leads) and partner verified/rejected emails. Env-gated (no key = no-op).
  **To activate:** (1) create a Resend account + API key; (2) verify a
  sending domain (or use `onboarding@resend.dev` to test to your own inbox);
  (3) on each worker set `wrangler secret put RESEND_API_KEY` and set
  `EMAIL_FROM` + `TEAM_EMAIL` (admin also `PARTNERS_URL`) vars in
  wrangler.jsonc; redeploy. WhatsApp alerts still a separate future add.
- [ ] **Password reset emails** — better-auth reset flow not wired (needs the
      email sender in packages/auth + forgot/reset pages in admin & partners).
      Now that @truelend/email exists, this is a smaller add.
- [ ] **CIBIL score integration** — `/cibil-score` is a coming-soon page
      capturing notify-me emails; real bureau integration is a separate project.
- [ ] **Blog authoring flow** — posts are MDX in `apps/website/content/blog/`
      (dev commits content). Revisit a CMS if the content team needs self-serve.
- [ ] **Old worker cleanup** — if `truelend-web` was ever deployed, delete it
      in the Cloudflare dash after `truelend-website` ships.

## Admin dashboard (apps/admin) — pending

- [x] **Built + auth** — `apps/admin` (Worker `truelend-admin`), better-auth
      (`packages/auth`) email+password with roles (admin/employee), leads inbox + pipeline + notes, loan cases (LMS-lite, paise money), team management,
      overview charts + MIS tables. Schema migration 0001 applied to Neon.
      First admin seeded (admin@truelend.in). Verified end-to-end on workerd.
- [x] **First production deploy of admin** — live at
      https://truelend-admin.truelend.workers.dev. `BETTER_AUTH_SECRET` set as a
      Worker secret. Smoke-tested in prod: unauth→/login, login returns admin
      role (scrypt fits the CPU budget on the real worker), dashboard/leads/mis
      200, robots noindex, website unaffected.
- [ ] **Purge seeded test data** — 3 test leads + 2 loan cases tagged
      `utm_source='admin-test'` were inserted to build/demo against. Delete
      before real operational use: `delete from leads where utm_source='admin-test'`
      (cascades to their loan cases).
- [ ] **Change the seeded admin password** — set to a throwaway during seeding
      (shared in chat). Reset via the Team page or re-seed.
- [ ] **Visual chart check** — the recharts charts render client-side; open the
      deployed overview in a browser and eyeball the trend/bars for layout.
- [ ] **Website ↔ reference sync** — `packages/reference` now holds canonical
      product/bank slugs+names; `apps/website/content/{products,banks}.ts` still
      duplicate them (richer data). Have the website consume `@truelend/reference`
      for slugs/names to remove the duplication.
- [ ] **Admin custom domain / Access** — currently a workers.dev URL, noindex.
      Consider Cloudflare Access (extra network-level gate) or a real subdomain.

## Partner Portal (apps/partners) — pending

- [x] **Built + deployed** — one role-driven app (`truelend-partners`) for
      business + referral partners: self-register → KYC upload to R2 →
      admin verification → type-branched dashboard (payout|incentive) → lead
      submission (single + bulk CSV). Admin got partner verification, an
      authenticated KYC doc viewer (cross-worker R2 read verified in prod),
      manual payout ledger, and partner channels/table in MIS. Schema 0002
      applied. Live at https://truelend-partners.truelend.workers.dev.
- [ ] **Registration action browser test** — the full flow was verified in
      prod via the API + DB (signup, KYC upload/read, approve, lead → MIS);
      still worth clicking through `registerPartner` (server action) in a
      browser once, since that exact action wasn't curl-driven.
- [ ] **Partner secret rotation** — `BETTER_AUTH_SECRET` for truelend-partners
      was generated locally and lives in `.dev.vars` (gitignored); fine, but
      rotate if it's ever shared.
- [ ] **Commission auto-calc** — payouts are a manual admin ledger (earned/
      paid). If TrueLend defines commission %s, add a rate + auto-accrue on
      disbursal (schema hook noted in mis/partner-actions).
- [ ] **CSV column mapping UX** — bulk import expects fixed columns
      (name/phone/email/city/product/message); add a template download + a
      column-mapping step if partners upload arbitrary exports.
- [ ] **Orphaned R2 cleanup** — re-uploading a KYC doc keeps the old R2 object
      (only the newest DB row is shown). Add a cleanup or overwrite-by-key later.
- [ ] **Partner training content** — /resources is placeholder cards; real
      decks/videos/collateral from TrueLend.

## Platform — upcoming (from the partnership MoM)

- [ ] **Mobile application** — scope undefined beyond the MoM line item.
- [ ] **TRAI/DLT compliance** — DLT registration, SMS template + sender-ID
      approval; prerequisite for SMS campaigns (LinchPin-owned).

## Gotchas worth remembering

- **Raw postgres.js (`db.$client`) with `fetch_types:false` returns timestamptz
  as a STRING** — wrap in `new Date()` before formatting. Drizzle queries parse
  dates; raw SQL ones don't. (Caused a partners-list 500.)
- **R2 upload on Workers** — use a POST route handler (not a server action:
  1MB body cap + OpenNext issue). Guard `entry instanceof File && entry.size>0`
  (workerd turns empty file inputs into `""`). Buffer with `await file.arrayBuffer()`
  to avoid the DOM/workers ReadableStream type mismatch. Private docs are proxied
  through an authenticated worker route — no presigned URLs.
- **Conditional SQL fragments** `${cond ? sql\`…\` : sql\`\`}` throw in the worker
runtime — use a null-guard WHERE (`where (${s}::text is null or col = ${s})`).

## Conventions

- Dashboards = separate Next.js apps in this monorepo (`apps/*`), each its own
  Worker, sharing `packages/ui`, `packages/db`, `packages/types`.
- All shared dependency versions live in the `catalog:` of `pnpm-workspace.yaml`.
