# Deploy readiness audit - 2026-06-24

Ucel: zhrnut, co je pred dizajnom/polishom uz pripravene v kode, co je overene lokalne a co ostava ako externy setup pre Adama/Jakuba.

## Stav vetiev

```text
main    cisty a zladeny s origin/main
staging zladeny s main po poslednych zmenach pred auditom
```

Pred deployom znova overit:

```bash
git status --short --branch
git log --oneline -3
```

## Hotove v kode

### Verejny web

- Astro frontend pre `jakubolsa.sk`.
- Homepage, ponuky/referencne predaje, detail nehnutelnosti, ochrana udajov, 404.
- Staging rezim cez `PUBLIC_SITE_ENV=staging` pridava `noindex` a staging badge.
- `robots.txt`, `sitemap.xml`, `llms.txt`.

### Rezervacny wizard

- `/rezervacia/` funguje ako kvalifikacny formular.
- Google Places autocomplete overuje lokalitu, ak je nastavene `PUBLIC_GOOGLE_MAPS_API_KEY`.
- Wizard posiela payload na `/api/book`.
- Pri zlyhani API ostava mailto fallback.

### Worker booking API

Endpointy:

```text
GET  /api/health
GET  /api/availability?date=YYYY-MM-DD
POST /api/book
```

Stavy v odpovedi `/api/book`:

```text
bookingStatus pending_calendar_config | calendar_created
crmStatus     skipped | created | failed
emailStatus   skipped | skipped_no_recipient | queued
```

### Google Calendar

- Worker podporuje Google Calendar `freeBusy`.
- Worker podporuje `events.insert`.
- Bez Google secrets bezi v `mock` rezime.
- S Google secrets ma vratit `mode: "google"` a `bookingStatus: "calendar_created"`.

### CRM

- Worker ma priamy Supabase CRM write path.
- Pri bookingu zapisuje:
  - `contacts`
  - `leads`
  - `appointments`
  - `notes`
- CRM zapis je neblokujuci. Ak zlyha, rezervacia sa pouzivatelovi nerozbije.

### Email potvrdenie

- Worker ma pripravenu Resend podporu.
- Bez `RESEND_API_KEY` vracia `emailStatus: "skipped"`.
- S `RESEND_API_KEY` a platnym emailom vracia `emailStatus: "queued"` a posiela potvrdenie cez `ctx.waitUntil`.

### Analytics a attribution

- Cookie consent sa zobrazi iba pri nastavenom GA/GTM/Meta env ID.
- Bez suhlasu sa analyticke/marketingove skripty nenacitaju.
- UTM/referrer/landing path sa zachytava aj bez analytics ID.
- Booking payload obsahuje `payload.attribution`.
- Do analytics eventov nejdu formulárove PII polia.

## Overene lokalne

Prikazy:

```bash
node --check workers/site-worker.js
git diff --check
npm run build
npm run worker:dev
curl http://127.0.0.1:8787/api/health
curl -X POST http://127.0.0.1:8787/api/book ...
```

Vysledok smoke bez externych secrets:

```json
{
  "ok": true,
  "mode": "mock",
  "bookingStatus": "pending_calendar_config",
  "crmStatus": "skipped",
  "emailStatus": "skipped",
  "eventId": "",
  "eventLink": ""
}
```

Dia/browser E2E uz preukazal:

- otvorenie `/rezervacia/`,
- attribution capture,
- vyber Google Places adresy,
- nacitanie dostupnych casov,
- submit booking formulára,
- potvrdenie na stranke.

## Externy setup pred live deployom

### Build-time public env

Tieto hodnoty musi poznat build prostredie, nie iba runtime Worker:

```text
PUBLIC_SITE_ENV
PUBLIC_GOOGLE_MAPS_API_KEY
PUBLIC_GTM_ID
PUBLIC_GA_MEASUREMENT_ID
PUBLIC_META_PIXEL_ID
```

Minimum pre staging:

```text
PUBLIC_SITE_ENV=staging
PUBLIC_GOOGLE_MAPS_API_KEY=<restricted browser key>
```

GA4/GTM/Meta zapnut az ked Adam vytvori meracie ucty a rozhodne, co ide cez GTM a co priamo.

### Runtime Worker env/secrets

Google Calendar:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REFRESH_TOKEN
GOOGLE_CALENDAR_ID
```

Telegram:

```text
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
```

Supabase CRM:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_TENANT_SLUG=jakub-olsa
SUPABASE_TENANT_NAME=Jakub Olša
```

Resend:

```text
RESEND_API_KEY
RESEND_FROM_EMAIL=Jakub Olša <rezervacie@jakubolsa.sk>
BOOKING_REPLY_TO_EMAIL=olsa@bosen.sk
```

### Email/DNS

- Potvrdit Cloudflare Email Routing destination pre `olsa@bosen.sk` alebo inu Jakubovu cielovu adresu.
- Vytvorit aliasy:
  - `rezervacie@jakubolsa.sk`
  - `kontakt@jakubolsa.sk`
  - `info@jakubolsa.sk`
- V Resende overit domenu/subdomenu a nastavit SPF/DKIM/DMARC podla Resendu.

## Staging smoke po nastaveni env/secrets

1. Deploy staging:

```bash
PUBLIC_SITE_ENV=staging npm run build
npx wrangler deploy --config wrangler.toml --name=jakubastroweb-staging
```

2. Overit:

```bash
curl https://staging.jakubolsa.sk/api/health
curl "https://staging.jakubolsa.sk/api/availability?date=2026-06-26"
```

3. Odoslat test booking cez staging wizard s emailom, ktory Adam kontroluje.

4. Očakavane po kompletnom setup-e:

```json
{
  "ok": true,
  "mode": "google",
  "bookingStatus": "calendar_created",
  "crmStatus": "created",
  "emailStatus": "queued",
  "eventId": "...",
  "eventLink": "..."
}
```

5. Manualne overit:

- event vznikol v spravnom Google kalendari,
- lead vznikol v Supabase CRM,
- email prisiel klientovi,
- Telegram/internal notifikacia prisla,
- GA4/GTM realtime vidi `booking_submit_success`, ak je analytics zapnuta.

## Ostava pred dizajnom/polishom

- Nastavit externe sluzby a secrets.
- Spravit staging live smoke.
- Potom ist do frontend dizajn/polish auditu s istotou, ze produktove segmenty su funkcne pokryte.
