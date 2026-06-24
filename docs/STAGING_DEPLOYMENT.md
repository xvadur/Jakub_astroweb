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
- Last verified: 30 May 2026

The staging page currently returns:

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
PUBLIC_SITE_ENV=staging npm run build
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

- `<meta name="robots" content="noindex,nofollow,noarchive">`
- a visible `STAGING` badge in the browser

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
- `BOOKING_TIME_ZONE`, `BOOKING_SLOT_MINUTES`, `BOOKING_WORK_START`, `BOOKING_WORK_END`, `BOOKING_WORKING_DAYS`, and `BOOKING_MIN_LEAD_MINUTES` are Worker vars in `wrangler.toml`.

`PUBLIC_GOOGLE_MAPS_API_KEY` must be restricted in Google Cloud to the production and staging domains. Do not store it in Git.

## Domain Email Routing

Status as of 24 June 2026:

- Inbound mail for `jakubolsa.sk` is handled by Cloudflare Email Routing.
- Websupport MX records were removed from Cloudflare DNS.
- Cloudflare MX records are active for the zone.
- Cloudflare SPF is active: `v=spf1 include:_spf.mx.cloudflare.net ~all`.
- Destination address `olsa@bosen.sk` exists in Cloudflare but is still unverified.
- Do not create forwarding aliases until the destination address is verified.

After Jakub confirms the final destination mailbox, create routing aliases:

```text
rezervacie@jakubolsa.sk -> <verified destination mailbox>
kontakt@jakubolsa.sk -> <verified destination mailbox>
info@jakubolsa.sk -> <verified destination mailbox>
```

Outbound booking confirmations are a separate task from Cloudflare Email Routing. Use Resend or another transactional email provider for sending. Keep sending disabled until the sender domain and API secret are configured.

Planned Worker variables for outbound email, once implemented and approved:

```text
EMAIL_PROVIDER=resend
EMAIL_FROM="Jakub Olša <rezervacie@jakubolsa.sk>"
EMAIL_REPLY_TO="rezervacie@jakubolsa.sk"
JAKUB_CONTACT_EMAIL="<verified destination mailbox>"
```

`RESEND_API_KEY` must be stored as a Cloudflare secret, never in the repository.

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
