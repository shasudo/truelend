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
- [ ] **First production deploy** — `pnpm deploy` (needs explicit go-ahead).
- [ ] **Browser end-to-end form test** — DB insert path is verified via SQL and
      the health check; still submit all 4 forms in a browser once deployed and
      confirm rows land with correct `kind` + UTM values.
- [ ] **Turnstile keys** — create a Turnstile site in the Cloudflare dash; set
      `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (build env) and `TURNSTILE_SECRET_KEY`
      (`.dev.vars` locally, `wrangler secret put` in prod). Forms pass through
      without keys by design.
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

## Platform — upcoming (from the partnership MoM)

- [ ] **CRM & LMS** (`apps/crm`) — lead management (assign/convert), loan
      pipeline (login → approval → disbursal), telecalling + customer-relationship
      dashboards, per-channel lead buckets (digital, corporate events, direct).
      Reads the same `leads` table this website writes.
- [ ] **Business Partner platform** (`apps/partner` or within CRM) —
      registration with document upload (PAN/Aadhaar/photo/cheque/GST → R2,
      camera capture + upload), verification workflow, login, lead upload,
      dashboard (leads/logins, product-wise business, approved/declined/
      disbursed, payout earned vs received), training & marketing collateral.
- [ ] **Referral Partner platform** — registration + docs, referral dashboard
      (leads, product-wise, disbursement volume, incentives earned/received).
- [ ] **Admin dashboard** (`apps/admin`) — cross-channel MIS: direct business,
      partner analytics (active/inactive, partner-wise payout, P&L),
      product-wise metrics by sourcing channel (direct/partner/referral/employee).
- [ ] **Auth** — none exists yet; required before any dashboard app. Pick one
      approach for all apps (e.g. better-auth or Auth.js) with role-based access
      (admin, employee, business partner, referral partner).
- [ ] **Mobile application** — scope undefined beyond the MoM line item.
- [ ] **TRAI/DLT compliance** — DLT registration, SMS template + sender-ID
      approval; prerequisite for SMS campaigns (LinchPin-owned).
- [ ] **Attribution beyond UTM** — partner/employee lead-source attribution for
      revenue share; extend `leads` when the partner platforms exist.

## Conventions

- Dashboards = separate Next.js apps in this monorepo (`apps/*`), each its own
  Worker, sharing `packages/ui`, `packages/db`, `packages/types`.
- All shared dependency versions live in the `catalog:` of `pnpm-workspace.yaml`.
