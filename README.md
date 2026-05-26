# Jakub Olša web

Astro one-page web for a real estate broker. The first version is built for Jakub Olša,
but the content is already isolated so it can later become a broker website template.

## Run locally

```bash
bun install
bun run dev
```

If Bun is not installed:

```bash
npm install --no-package-lock
npm run dev -- --host 127.0.0.1
```

Production build:

```bash
npm run build
```

## Main files

- `src/pages/index.astro` - homepage layout, styles, booking behavior
- `src/data/site.ts` - broker content, contact data, listings, services
- `src/pages/ochrana-osobnych-udajov.astro` - privacy page draft
- `docs/PROJECT_STATUS.md` - internal status, launch checklist, deployment notes
- `ops/telegram-worker` - minimal Telegram notification endpoint without n8n
- `ops/n8n` - optional local n8n Docker setup for heavier lead automation and CRM handoff
- `source-assets/originals` - archived original photos and uploads kept outside the public build

## Before public launch

Confirm these values in `src/data/site.ts`:

- real Instagram URL and handle
- real Google Calendar appointment schedule link
- operating location
- confirm imported draft listing photos from Bosen can be used on the live site
- replace AI/generated broker imagery if Jakub wants only real photography

Legal/privacy:

- fill in the real data controller details
- confirm GDPR wording before launch

## Booking behavior

The main conversation CTA links to Jakub's Google Calendar appointment schedule. Visitors book a
phone call in Google's booking flow, while the website stays static and mobile-friendly.

For local preview, the site falls back to Adam's test booking link in dev mode. For production,
set `PUBLIC_BOOKING_URL` to Jakub's real appointment schedule URL before deployment.

This does not create a local CRM record by itself. Lead storage, Telegram notifications, or agent
handoff can be added later through a backend such as Cloudflare Worker, OpenClaw, n8n, or another
API.

## Asset hygiene

Only optimized, referenced public assets should live in `public/images`. Raw uploads and original
client files belong in `source-assets/originals` so they are preserved in the repo but not copied
to the production build.
