# Staging-only backlog before branch cleanup - 2026-06-24

Purpose: keep `main` as the current frontend source of truth and record what was only on `staging` before syncing the branches.

Decision:
- The current public frontend should follow `main`.
- The old `staging` branch contains useful experiments and operating work, but it should not drive the frontend until individual parts are reviewed and re-applied deliberately.
- Use the backup branch below as the source for cherry-picks or manual extraction.

Source references:
- `main` kept as frontend baseline: `d75605bad72abafa659c752514e38eb319e98d31`
- old local `staging` before cleanup: `2501846f535e060c04120a71132288560c04929b`
- old remote `origin/staging` before cleanup: `25ff7231e75c8c74402b09bcfb78f4834bba9bd8`
- backup branch to preserve old staging: `backup/staging-before-main-sync-2026-06-24`

## Frontend candidates to review later

These are the staging-only UI/page pieces most likely to be useful later, but they should be reworked against the current `main` frontend rather than merged wholesale.

- `src/pages/predaj-bytu-bratislava.astro`  
  Seller landing page / SEO page for Bratislava apartment sales. Treat as a page concept to rebuild or selectively port.
- `src/pages/dashboard/index.astro` and `src/pages/dashboard/leady.astro`  
  Internal dashboard / lead cockpit prototype. Keep out of public frontend until the data/backend story is clear.
- `src/components/CookieConsent.astro`  
  Consent banner and analytics gating UI. Reintroduce only together with final analytics/cookie policy.
- `src/components/dashboard/DashboardSidebar.astro`  
  Dashboard support component, only relevant if the dashboard returns.
- `src/data/seo.ts` plus changes in `src/pages/robots.txt.ts`, `src/pages/sitemap.xml.ts`, `src/pages/llms.txt.ts`, `src/pages/404.astro`, `src/pages/ochrana-osobnych-udajov.astro`, `src/pages/nehnutelnosti/[slug].astro`, and `src/pages/index.astro`  
  SEO/crawl/privacy/listing changes. Review file by file; do not bulk merge because `main` has newer production crawl fixes and listing work.
- `src/styles/global.css`  
  Shared styling introduced by staging. Reuse only if a future redesign needs it.
- `public/images/brand/jakub-face-avatar.jpg`  
  Candidate brand asset. Review image usage and licensing before reintroducing.

## Lead engine, scripts, and ads tooling

These are potentially useful for the seller-lead sprint, but they are operational tooling, not frontend baseline.

- `scripts/ads-seller-*.mjs`
- `scripts/analytics-conversion-audit.mjs`
- `scripts/leadgen-*.mjs`
- `scripts/manual-hunting-*.mjs`
- `scripts/build-manual-hunting-cockpit.mjs`
- `scripts/staging-booking-e2e.mjs`
- `scripts/dev-health-check.mjs`
- `ops/ads/*.csv`
- `ops/monitoring/*`

Recommended next step: extract these into a reviewed "lead-engine tooling" branch after confirming which scripts still match current data files and `package.json`.

## OpenClaw / CRM / Supabase operations

These are large system scaffolds. Preserve them, but do not merge into frontend branches by default.

- `ops/openclaw/**`
- `ops/openclaw/supabase/SUPABASE_SCHEMA.sql`
- `ops/openclaw/tools/*.mjs`
- `ops/n8n/README.md` changes
- `package.json` script additions for leadgen, ads, health checks, and manual hunting
- `workers/site-worker.js` changes for CRM/dashboard/booking behavior
- `wrangler.toml` changes

Recommended next step: review this as an infrastructure lane, with secrets/runtime assumptions checked before any production use.

## Docs and research worth mining

The old staging branch contains a lot of useful planning material. Keep it as reference, but avoid dumping all of it into `main` unless it is actively used.

High-signal documents:
- `docs/COOKIES_ANALYTICS_RESEARCH_2026-06-18.md`
- `docs/COOKIES_PRODUCTION_CHECKLIST_2026-06-18.md`
- `docs/FULL_LAUNCH_BACKEND_TODO_2026-06-18.md`
- `docs/GDPR_DATA_MAP_AND_LAWYER_QUESTIONS_2026-06-07.md`
- `docs/GOOGLE_SEARCH_20_LEAD_CAMPAIGN_2026-06-18.md`
- `docs/JAKUB_COPY_INTERVIEW_AND_POSITIONING_2026-06-18.md`
- `docs/LAUNCH_CHECKLIST_ADS_SEO_EMAIL_MONITORING_2026-06-18.md`
- `docs/META_SELLER_20_LEAD_CREATIVES_2026-06-19.md`
- `docs/SELLER_20_LEAD_SPRINT_2026-06-18.md`
- `docs/SELLER_LEAD_ENGINE_CHECKLIST_2026-06-10.md`
- `docs/WEB_BOOKING_QUALIFIED_SELLER_LEADS_2026-06-19.md`

Archive/prototype material:
- `docs/prototype-archive/**`
- `prototypes/geniestudio-jakub/index.html`
- `prototypes/penpot/**`

## Suggested reintroduction order

1. Rebuild only the seller landing page concept if needed: start from `src/pages/predaj-bytu-bratislava.astro`, but adapt it to current `main` styling and copy rules.
2. Reintroduce cookie/analytics only after the measurement plan is approved; pair `CookieConsent.astro`, analytics audit scripts, and privacy text together.
3. Review leadgen scripts as a separate ops/tooling branch, not as frontend work.
4. Review OpenClaw/CRM/Supabase as an infrastructure branch after confirming runtime, secrets, and ownership.
5. Only then consider dashboard pages, because they depend on the backend/data model being real.

## Branch cleanup target

After this document is committed:
- preserve old staging at `backup/staging-before-main-sync-2026-06-24`;
- reset `staging` to the current `main`;
- push both branches so `main` and `staging` are clean and aligned.
