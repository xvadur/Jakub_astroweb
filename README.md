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
- `docs/STAGING_DEPLOYMENT.md` - staging workflow and Cloudflare Worker setup
- `docs/DECISIONS.md` - project decision log
- `docs/FILESYSTEM_LAYOUT.md` - canonical folder and compatibility aliases
- `docs/CONVERSION_FUNNEL_RESEARCH.md` - sales funnel and booking research
- `docs/GOOGLE_CALENDAR_BOOKING.md` - Worker API, Google Calendar sync, and Telegram notification plan
- `docs/WEDNESDAY_PREP.md` - meeting prep for Jakub
- `ops/telegram-worker` - minimal Telegram notification endpoint without n8n
- `ops/n8n` - optional local n8n Docker setup for heavier lead automation and CRM handoff
- `source-assets/originals` - archived original photos and uploads kept outside the public build

## Deployment workflow

Production and staging are separated:

- production: `https://jakubolsa.sk/`
- staging: `https://staging.jakubolsa.sk/`

Use `staging` for website changes, lead magnet experiments, tracking, booking, and OpenClaw-driven edits. Move changes to `main` only after review.

```bash
npm run deploy:staging
npm run deploy:production
```

Staging builds use `PUBLIC_SITE_ENV=staging`, which adds `noindex,nofollow,noarchive` and a visible `STAGING` badge.

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

The primary CTA opens `/rezervacia/`, a custom consultation wizard. The wizard posts to the
Cloudflare Worker API instead of opening the visitor's email client.

Current API routes:

- `GET /api/availability?date=YYYY-MM-DD`
- `POST /api/book`

Without Google Calendar secrets, the API runs in mock mode so the UI can be tested end-to-end.
After Google OAuth secrets are configured, the Worker checks `freeBusy`, creates a Google Calendar
event, and sends a Telegram notification. See `docs/GOOGLE_CALENDAR_BOOKING.md`.

## Asset hygiene

Only optimized, referenced public assets should live in `public/images`. Raw uploads and original
client files belong in `source-assets/originals` so they are preserved in the repo but not copied
to the production build.
