# TrueLend — Pending Work

Living checklist. Tick items off as they land; add new ones with enough
context to pick up cold. (MoM scope tracked here without dates, per decision.)

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
- [ ] **Lead notifications** — leads currently land in Postgres only. Add
      email/WhatsApp alert to the advisory team (e.g. Resend / WhatsApp API)
      so leads aren't discovered by polling.
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
- [ ] **First production deploy of admin** — `wrangler secret put
    BETTER_AUTH_SECRET` (apps/admin) then `pnpm deploy:admin` →
      truelend-admin.truelend.workers.dev. Needs explicit go-ahead.
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

## Platform — upcoming (from the partnership MoM)

- [ ] **Business Partner platform** (`apps/partner`) — registration with document
      upload (PAN/Aadhaar/photo/cheque/GST → R2, camera capture + upload),
      verification workflow, login (reuse `packages/auth`, add `partner` role),
      lead upload, dashboard (leads/logins, product-wise business, approved/
      declined/disbursed, payout earned vs received), training & collateral.
- [ ] **Referral Partner platform** (`apps/referral`) — registration + docs,
      referral dashboard (leads, product-wise, disbursement volume, incentives
      earned/received). `referral` role in `packages/auth`.
- [ ] **Partner attribution in schema** — add `source_channel` enum +
      `partner_id` FK to `leads` (and a partners table + payout ledger) when the
      partner apps land; MIS `channelForKind` is a placeholder until then.
- [ ] **Mobile application** — scope undefined beyond the MoM line item.
- [ ] **TRAI/DLT compliance** — DLT registration, SMS template + sender-ID
      approval; prerequisite for SMS campaigns (LinchPin-owned).

## Conventions

- Dashboards = separate Next.js apps in this monorepo (`apps/*`), each its own
  Worker, sharing `packages/ui`, `packages/db`, `packages/types`.
- All shared dependency versions live in the `catalog:` of `pnpm-workspace.yaml`.
