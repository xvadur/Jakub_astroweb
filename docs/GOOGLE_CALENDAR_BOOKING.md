# Google Calendar booking backend

## Goal

Rezervačný wizard na `/rezervacia/` má postupne prejsť z preferovaných termínov na reálne sloty
synchornizované s Google kalendárom. Google Calendar bude zdroj pravdy pre obsadenosť.

## Current implementation

Web je nasadený ako Cloudflare Worker Static Assets projekt s vlastným Worker scriptom:

- static Astro build: `dist/`
- Worker entrypoint: `workers/site-worker.js`
- Wrangler config: `wrangler.toml`

API routy:

- `GET /api/health` - smoke check backendu.
- `GET /api/availability?date=YYYY-MM-DD` - vráti sloty pre daný dátum.
- `POST /api/book` - prijme lead, overí slot, prípadne zapíše Google Calendar event a pošle Telegram.

Kým nie sú nastavené Google secrets, API beží v `mock` režime:

- vracia 30-minútové sloty v pracovnom okne,
- nevolá Google Calendar,
- `POST /api/book` vráti `bookingStatus: "pending_calendar_config"`,
- ak sú nastavené Telegram secrets, aj mock booking pošle Telegram notifikáciu.

## Target flow

```text
wizard
  -> GET /api/availability
  -> Google Calendar freeBusy
  -> only free slots shown

wizard submit
  -> POST /api/book
  -> second freeBusy check
  -> Google Calendar events.insert
  -> Telegram notification
  -> later OpenClaw follow-up
```

## Required Google setup

For Adam testing first, then Jakub production:

1. Create or reuse a Google Cloud project.
2. Enable Google Calendar API.
3. Configure OAuth consent screen.
4. Create OAuth client credentials.
5. Authorize the account that owns the target calendar.
6. Store the refresh token as a Cloudflare secret.

Required OAuth scopes:

```text
https://www.googleapis.com/auth/calendar.freebusy
https://www.googleapis.com/auth/calendar.events
```

Secrets:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REFRESH_TOKEN
GOOGLE_CALENDAR_ID
```

Use `GOOGLE_CALENDAR_ID=primary` for the authorized user's primary calendar.

## Telegram setup

Secrets:

```text
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
```

Telegram is not part of the critical booking write path. If Telegram fails after the Google Calendar
event is created, the booking should still be considered accepted.

## Cloudflare setup

Non-secret defaults are in `wrangler.toml`:

```text
BOOKING_TIME_ZONE=Europe/Bratislava
BOOKING_SLOT_MINUTES=30
BOOKING_WORK_START=09:00
BOOKING_WORK_END=19:00
BOOKING_WORKING_DAYS=0,1,2,3,4,5,6
BOOKING_MIN_LEAD_MINUTES=120
```

Secrets must be set per Worker/environment:

```bash
npx wrangler secret put GOOGLE_CLIENT_ID --name jakubastroweb-staging
npx wrangler secret put GOOGLE_CLIENT_SECRET --name jakubastroweb-staging
npx wrangler secret put GOOGLE_REFRESH_TOKEN --name jakubastroweb-staging
npx wrangler secret put GOOGLE_CALENDAR_ID --name jakubastroweb-staging
npx wrangler secret put TELEGRAM_BOT_TOKEN --name jakubastroweb-staging
npx wrangler secret put TELEGRAM_CHAT_ID --name jakubastroweb-staging
```

Repeat for `jakubastroweb` only after the staging flow is approved.

## Testing

Local Worker preview:

```bash
npm run worker:dev
```

Smoke checks:

```bash
curl http://127.0.0.1:8787/api/health
curl "http://127.0.0.1:8787/api/availability?date=2026-06-02"
```

Example booking payload:

```bash
curl -X POST http://127.0.0.1:8787/api/book \
  -H "Content-Type: application/json" \
  -d '{
    "meno": "Test User",
    "telefon": "+421900000000",
    "email": "test@example.com",
    "zamer": "Predať byt",
    "typ": "Byt",
    "lokalita": "Bratislava",
    "datum": "2026-06-02",
    "cas": "09:00",
    "parametre": ["Izby: 3", "Výmera: 80 m²"]
  }'
```

Expected before Google secrets:

```json
{
  "ok": true,
  "mode": "mock",
  "bookingStatus": "pending_calendar_config"
}
```

Expected after Google secrets:

```json
{
  "ok": true,
  "mode": "google",
  "bookingStatus": "calendar_created"
}
```

## OpenClaw role

OpenClaw should not be in the critical calendar-write path. The Worker must own the transactional
booking flow. OpenClaw can process Telegram/D1/CRM data after the booking is accepted:

- summarize lead,
- score urgency/value,
- prepare follow-up,
- write to CRM/Notion/Google Sheet,
- alert Adam/Jakub when a lead looks high-value.
