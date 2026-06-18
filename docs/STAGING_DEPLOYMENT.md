# Staging deployment

Staging exists so website, lead magnet, tracking, OpenClaw, and booking changes can be reviewed before they touch `jakubolsa.sk`.

## Branches

```text
main
  -> production
  -> https://jakubolsa.sk/

staging
  -> test environment
  -> https://staging.jakubolsa.sk/
  -> fallback: https://jakubastroweb-staging.yksvadur-ja.workers.dev/
```

Use `main` only for approved production changes. Use `staging` for work that needs browser review, client review, or OpenClaw testing.

## Active Cloudflare setup

Staging is deployed as a separate Cloudflare Worker:

- Worker: `jakubastroweb-staging`
- Custom route: `staging.jakubolsa.sk/*`
- Public staging URL: `https://staging.jakubolsa.sk/`
- Workers.dev fallback: `https://jakubastroweb-staging.yksvadur-ja.workers.dev/`
- Last verified: 18 June 2026
- Last deployed version: `6c4540ac-5406-4a0a-ba97-300fea55f97d`

The staging page currently returns:

- `/robots.txt` with explicit `Disallow: /` and `Disallow: /*` for `Googlebot`, `OAI-SearchBot`, `Bingbot`, and `*`
- `<meta name="robots" content="noindex,nofollow,noarchive">`
- visible `STAGING` badge in the browser

## Deploy setup

The staging deploy must not use the production worker name.

Production deploy command:

```bash
npx wrangler deploy --config wrangler.toml --name=jakubastroweb
```

Staging deploy command:

```bash
PUBLIC_SITE_ENV=staging PUBLIC_ANALYTICS_MODE=test PUBLIC_GA4_MEASUREMENT_ID=G-E8EE4LE3NQ npm run build
npx wrangler deploy --config wrangler.toml --name=jakubastroweb-staging
```

Recommended Cloudflare setup:

- Keep a separate Worker/Build target named `jakubastroweb-staging`.
- Connect it to the same GitHub repo if automatic deploys are enabled.
- Set its production branch to `staging`.
- Keep the custom route `staging.jakubolsa.sk/*`.
- Set `PUBLIC_SITE_ENV=staging` for staging builds.
- Keep `PUBLIC_BOOKING_URL` empty on staging unless testing the real booking flow intentionally.
- Configure booking secrets only on staging first when testing Google Calendar sync.

`PUBLIC_SITE_ENV=staging` adds:

- `/robots.txt` with explicit crawler blocking for staging
- `<meta name="robots" content="noindex,nofollow,noarchive">`
- a visible `STAGING` badge in the browser

Cloudflare Managed Content Signals may prepend its own content-signal block to `robots.txt`.
Staging therefore also uses page-level `noindex` and explicit named crawler groups.

## Workflow

```text
local edit
  -> npm run build
  -> commit on staging
  -> push staging
  -> review staging URL
  -> merge/cherry-pick to main
  -> production deploy
```

For OpenClaw, public web mutations should follow this path:

```text
agent prepares change
  -> build gate
  -> staging deploy
  -> Adam/Jakub approval
  -> production merge
```

## Local commands

```bash
npm run build
npm run deploy:staging
npm run deploy:production
```

Wrangler needs a Cloudflare login or `CLOUDFLARE_API_TOKEN`. Do not store the token in the repository. Use it only through the shell environment or Cloudflare dashboard secrets.

## Environment variables

- `PUBLIC_SITE_ENV=staging` for staging builds.
- `PUBLIC_BOOKING_URL` optional external calendar link.
- `PUBLIC_GOOGLE_MAPS_API_KEY` optional browser key for Google Places autocomplete on `/rezervacia/`.
- `PUBLIC_ANALYTICS_MODE=disabled|test|production`; staging should use `test` only with separate test GA4/Ads IDs, otherwise keep `disabled`.
- `PUBLIC_GA4_MEASUREMENT_ID`, `PUBLIC_GOOGLE_ADS_ID`, and `PUBLIC_GOOGLE_ADS_CONVERSION_LABEL` are build-time public values for the consent-aware direct Google tag loader. Do not put production IDs into staging builds.
- `BOOKING_TIME_ZONE`, `BOOKING_SLOT_MINUTES`, `BOOKING_WORK_START`, `BOOKING_WORK_END`, `BOOKING_WORKING_DAYS`, and `BOOKING_MIN_LEAD_MINUTES` are Worker vars in `wrangler.toml`.

`PUBLIC_GOOGLE_MAPS_API_KEY` must be restricted in Google Cloud to the production and staging domains. Do not store it in Git.

## Booking API secrets

The Worker API can run without secrets in mock mode. For live Google Calendar sync, set these as
Cloudflare secrets on `jakubastroweb-staging` first:

```bash
npx wrangler secret put GOOGLE_CLIENT_ID --name jakubastroweb-staging
npx wrangler secret put GOOGLE_CLIENT_SECRET --name jakubastroweb-staging
npx wrangler secret put GOOGLE_REFRESH_TOKEN --name jakubastroweb-staging
npx wrangler secret put GOOGLE_CALENDAR_ID --name jakubastroweb-staging
npx wrangler secret put TELEGRAM_BOT_TOKEN --name jakubastroweb-staging
npx wrangler secret put TELEGRAM_CHAT_ID --name jakubastroweb-staging
```

Repeat on `jakubastroweb` only after the staging flow is approved.

Optional client confirmation email after successful booking:

```bash
npx wrangler secret put RESEND_API_KEY --name jakubastroweb-staging
```

Required non-secret vars when testing email:

```bash
EMAIL_PROVIDER=resend
EMAIL_FROM="Jakub Olša <rezervacie@jakubolsa.sk>"
EMAIL_REPLY_TO="..."
JAKUB_CONTACT_EMAIL="..."
JAKUB_CONTACT_PHONE="..."
```

If `EMAIL_PROVIDER` is empty, `disabled` or `off`, the booking flow skips client email and still returns success.

Status 2026-06-06:

- `jakubastroweb-staging` has Google Calendar and Telegram booking secrets configured.
- `jakubastroweb-staging` also has the Supabase service role key configured as a Cloudflare secret for server-side CRM writes.
- `jakubastroweb` had no secrets during the 2026-06-06 check.
- A staging smoke test confirmed `/api/availability` returns `mode: "google"`.
- A Supabase CRM smoke test confirmed `/api/book` can return `crmStatus: "crm_created"`.
- Public staging dashboard/API is intentionally in demo mode. Real Supabase dashboard reads stay disabled until dashboard auth is in place.

## Supabase CRM secrets and schema

The Worker can optionally persist accepted booking leads into Supabase. The browser must never receive the service role key; dashboard reads go through Worker API routes.

Non-secret defaults live in `wrangler.toml`:

```text
SUPABASE_URL
SUPABASE_TENANT_SLUG
SUPABASE_TENANT_NAME
DASHBOARD_PUBLIC_MODE=staging-demo
DASHBOARD_DATA_MODE=demo
```

Required staging secret:

```bash
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --name jakubastroweb-staging
```

Required Supabase database step:

```text
Supabase Dashboard -> SQL Editor -> run ops/openclaw/supabase/SUPABASE_SCHEMA.sql
```

Verification after schema exists:

```bash
curl https://staging.jakubolsa.sk/api/dashboard/leads
```

Expected result before real leads:

```json
{"ok":true,"mode":"demo","leads":[...]}
```

If the endpoint says `public.tenants` is missing, the SQL schema has not been run yet.

Status 2026-06-06:

- The schema was run in Supabase.
- `GET /api/dashboard/leads` previously returned `mode: "supabase"` during smoke testing.
- A test booking created a Google Calendar event and Supabase contact/lead/appointment records.
- The public staging endpoint is now kept in `mode: "demo"` so smoke test PII is not exposed.

Before storing real client data, protect:

```text
/dashboard/*
/api/dashboard/*
```

Use Cloudflare Access or a proper app auth layer before the dashboard becomes operational with personal data. Only after that should `DASHBOARD_DATA_MODE=crm` be enabled.

## OpenClaw handoff secrets

The booking Worker can optionally hand off a successfully accepted booking to OpenClaw after the Calendar/booking response path. This is non-blocking and should be tested on staging first.

Local preflight 2026-06-04:

- Docker OpenClaw `/hooks/agent` is enabled on `http://127.0.0.1:18789/hooks/agent`.
- Local Worker E2E test passed in mock mode: `/api/book` returned `200 OK`, `ctx.waitUntil` handed the booking to OpenClaw, and `jakub-olsa` created an internal admin case.
- Historical note: an older HighLevel connector test returned `401 Reauthentication required`. Current CRM direction is Supabase; OpenClaw still needs deterministic Supabase tools before it can write CRM records reliably.
- Staging still needs a public HTTPS URL for the local OpenClaw hook, for example Cloudflare Tunnel/Access.
- Do not configure deployed Cloudflare Workers with a `localhost` or `127.0.0.1` OpenClaw hook URL. That only works for local Worker E2E tests.

Local repo preflight 2026-06-05:

- Docker OpenClaw mounts Jakub Astro repo from `/Users/xvadur_mac/Jakub_Astro` to `/home/node/Jakub_Astro`.
- `jakub-olsa` can read `/home/node/Jakub_Astro/package.json` and `/home/node/Jakub_Astro/astro.config.mjs`.
- Agent connection smoke test returned `CONNECTED`, package `clients-jakub-olsa`, and confirmed `astro.config.mjs`.

Required staging secrets:

```bash
npx wrangler secret put OPENCLAW_HOOK_URL --name jakubastroweb-staging
npx wrangler secret put OPENCLAW_HOOK_TOKEN --name jakubastroweb-staging
```

Optional staging secrets when the OpenClaw hook is behind Cloudflare Access:

```bash
npx wrangler secret put OPENCLAW_CF_ACCESS_CLIENT_ID --name jakubastroweb-staging
npx wrangler secret put OPENCLAW_CF_ACCESS_CLIENT_SECRET --name jakubastroweb-staging
```

Optional fallback delivery to Telegram from the isolated OpenClaw run:

```bash
npx wrangler secret put OPENCLAW_DELIVER --name jakubastroweb-staging
npx wrangler secret put OPENCLAW_DELIVERY_CHANNEL --name jakubastroweb-staging
npx wrangler secret put OPENCLAW_DELIVERY_TO --name jakubastroweb-staging
```

Recommended values after Telegram is verified:

```text
OPENCLAW_DELIVER=announce
OPENCLAW_DELIVERY_CHANNEL=telegram
OPENCLAW_DELIVERY_TO=<Jakub chat id or trusted group id>
```

Non-secret defaults live in `wrangler.toml`:

```text
OPENCLAW_AGENT_ID=jakub-olsa
OPENCLAW_HOOK_TIMEOUT_MS=8000
OPENCLAW_TIMEOUT_SECONDS=120
```
