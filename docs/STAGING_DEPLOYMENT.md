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
- Last verified: 29 May 2026

The staging page currently returns:

- `<meta name="robots" content="noindex,nofollow,noarchive">`
- visible `STAGING` badge in the browser

## Deploy setup

The staging deploy must not use the production worker name.

Production deploy command:

```bash
npx wrangler deploy --assets=dist --name=jakubastroweb --compatibility-date=2026-05-26
```

Staging deploy command:

```bash
PUBLIC_SITE_ENV=staging npm run build
npx wrangler deploy --assets=dist --name=jakubastroweb-staging --compatibility-date=2026-05-26
```

Recommended Cloudflare setup:

- Keep a separate Worker/Build target named `jakubastroweb-staging`.
- Connect it to the same GitHub repo if automatic deploys are enabled.
- Set its production branch to `staging`.
- Keep the custom route `staging.jakubolsa.sk/*`.
- Set `PUBLIC_SITE_ENV=staging` for staging builds.
- Keep `PUBLIC_BOOKING_URL` empty on staging unless testing the real booking flow intentionally.

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
