# Signal Engine stability plan - 2026-06-24

Ucel: prelozit AI leadgen research do stabilnej implementacie pre aktualny Jakub system. Tento dokument hovori, ako to spravit v nasom kode bez toho, aby sa rozbila rezervacia.

## Stabilny princip

Kriticka cesta bookingu musi ostat deterministicka a kratka:

```text
validate payload
  -> check slot / create calendar event when configured
  -> try CRM write
  -> queue side effects
  -> return user-safe response
```

Vsetko ostatne je vedlajsi efekt alebo obohatenie:

- analytics eventy,
- scoring detail,
- Telegram notifikacia,
- email confirmation,
- campaign feedback export,
- AI follow-up,
- OpenClaw summary.

Ak vedlajsi efekt zlyha, booking sa pouzivatelovi nesmie pokazit. Chyba ma ist do logu, CRM note alebo admin case.

## Aktualne oporne body v kode

Frontend wizard:

- `src/pages/rezervacia.astro` emituje `window.jakubTrackEvent(...)`.
- Wizard emituje `booking:funnel` browser event.
- `buildLeadPayload()` posiela `payload.attribution`.

Analytics:

- `src/components/AnalyticsConsent.astro` zachytava UTM, referrer a landing path.
- Externe GA/GTM/Meta skripty su consent-gated.
- Attribution helper bezi aj bez zapnutej externej analytiky.

Worker:

- `workers/site-worker.js` ma `GET /api/availability` a `POST /api/book`.
- `POST /api/book` vracia `bookingStatus`, `crmStatus`, `emailStatus`.
- CRM write path uz zapisuje `contacts`, `leads`, `appointments`, `notes`.
- `leads.qualification_score` existuje, ale aktualne sa zapisuje ako `null`.

## Cielovy data flow

```text
Visitor
  -> page attribution capture
  -> wizard events
  -> booking payload
  -> Worker scoring + validation
  -> Calendar event
  -> CRM contact/lead/appointment/note
  -> notification + email
  -> OpenClaw/Adam/Jakub follow-up
  -> later campaign feedback
```

Najdolezitejsia zmena:

```text
booking payload + attribution
  -> lead score + lead status
  -> CRM outcome
```

## P0 implementation

### 1. Lead score vo Workerovi

Pridat do `workers/site-worker.js` cistu funkciu:

```js
function calculateLeadScore(payload, context = {}) {
  return {
    score: 0,
    bucket: "weak",
    reasons: [],
  };
}
```

V1 pravidla:

```text
+30 seller intent: predaj bytu, predaj domu, predaj pozemku, predaj komercneho priestoru
+20 komplet kontakt: meno + telefon + email
+15 overena lokalita: lokalita_place_id alebo lokalita
+15 zvoleny datum a cas
+10 casovy horizont do 3 mesiacov
+10 aspon 3 parametre nehnutelnosti
+5 sprava ma aspon 40 znakov
-20 chyba telefon
-15 chyba email
-20 chyba zamer
```

Bucket:

```text
80-100 hot
50-79 qualified
25-49 nurture
0-24 weak
```

Score sa musi clampnut na rozsah `0..100`.

### 2. CRM zapis score

Pri `createBookingCrmRecords(...)`:

- vypocitat score pred insertom leadu,
- zapisat `qualification_score: leadScore.score`,
- pridat `lead_score` detail do `raw_payload`,
- pridat score/bucket/reasons do system note.

Prakticky tvar v `raw_payload`:

```json
{
  "source": "jakubolsa.sk/rezervacia",
  "payload": {},
  "lead_score": {
    "score": 85,
    "bucket": "hot",
    "reasons": ["seller_intent", "complete_contact", "selected_slot"]
  }
}
```

### 3. Prioritizovana notifikacia

Telegram/email/admin note maju obsahovat:

```text
Lead score: 85 / hot
Zamer: Predaj bytu
Zdroj: utm_source=google, utm_medium=cpc, campaign=...
Dalsi krok: zavolat alebo potvrdit konzultaciu do 2 hodin
```

Next action pravidla:

```text
hot       -> zavolat/potvrdit do 2 hodin
qualified -> potvrdit do 24 hodin
nurture   -> ulozit follow-up a poslat jemny email
weak      -> skontrolovat manualne, neeskalovat ako urgent
```

### 4. Attribution rozsirene pre kampane

V `AnalyticsConsent.astro` rozsirit ulozene attribution polia o:

```text
gclid
gbraid
wbraid
fbclid
msclkid
```

Do analytics eventov stale neposielat PII.

Do booking payloadu pridat aj:

```text
session_id
lead_correlation_id
consent_state
```

`lead_correlation_id` moze byt klientsky UUID vytvoreny pri submit-e. V1 nemusi byt globalne unikatny kryptograficky dokonaly, ale musi pomoct spajat browser eventy, booking response a CRM zaznam.

### 5. CRM statusy

V1 statusy pre `leads.status`:

```text
new
contacted
appointment_booked
appointment_completed
qualified
opportunity
won
lost
nurture
```

Booking submit vytvara `new`.

Ak `bookingStatus === "calendar_created"`, appointment status zostava `confirmed`, ale lead status nemusi automaticky skakat na `qualified`. Kvalita leadu sa riadi score a realnym follow-upom.

## P1 implementation

### 1. Idempotency

Problem: dvojklik alebo retry moze vytvorit dva eventy/leady.

V1 riesenie:

- frontend posiela `lead_correlation_id`,
- Worker pred vytvorenim kalendar eventu skontroluje, ci uz existuje appointment/lead s rovnakym correlation ID v `raw_payload`,
- ak existuje, vrati existujuci vysledok alebo user-safe duplicate response.

Ak query nad raw JSON bude v Supabase tazkopadna, P1.5 riesenie je pridat explicitny stlpec `correlation_id`.

### 2. Rate limiting

Problem: spam alebo bot moze zneuzit `/api/book`.

V1 riesenie:

- minimalne honeypot `payload.website` uz existuje;
- pridat IP/session based limit cez Cloudflare rate limiting alebo Durable Object/KV;
- limitovat pokusy na booking endpoint, nie cele staticke web requesty.

### 3. Internal event log

Minimalna schema:

```text
lead_events
  id
  tenant_id
  lead_id
  event_type
  source
  payload
  created_at
```

V1 bez migracie:

- pouzit `notes` pre systemove eventy;
- full `lead_events` az ked bude realne treba reportovat viac nez posledny stav.

### 4. Report

Najjednoduchsi P1 report:

```text
last 30 days
  leads by source
  leads by score bucket
  bookingStatus / crmStatus / emailStatus
  hot leads without contacted status
```

Toto moze byt najprv CLI alebo markdown export, nie dashboard.

## P2 implementation

### AI follow-up pack

AI nesmie byt v kritickej ceste bookingu.

Pouzitie:

- pripravit Jakub call brief z CRM payloadu;
- navrhnut follow-up email po konzultacii;
- rano zhrnut hot/nurture leady;
- odporucit dalsi krok podla statusu.

OpenClaw je dobra vrstva pre P2, lebo uz ma byt interny operator nad CRM, nie verejny user-facing chatbot.

### Campaign feedback exports

Google/Meta feedback zapnut az ked:

- existuju realne leady,
- vieme, ktore su kvalifikovane,
- mame consent/GDPR rozhodnutie,
- vieme mapovat `gclid/fbclid` alebo hashovane first-party udaje legalne a technicky spravne.

V1 predpriprava je ulozit identifikatory a statusy. Produkcny export je samostatny sprint.

## Stabilizacne acceptance checks

Pred tym, nez sa povie "Signal Engine V1 je hotovy", musi platit:

1. `npm run build` prejde.
2. `node --check workers/site-worker.js` prejde.
3. Lokalne `POST /api/book` bez secrets vrati `ok: true`, `mode: mock`, `crmStatus: skipped`.
4. S test CRM env sa lead zapise so `qualification_score`.
5. Submit payload obsahuje attribution + correlation ID.
6. Telegram/admin note obsahuje score a next action, ak je Telegram zapnuty.
7. Bez Resend API sa booking nepokazi.
8. Bez Supabase env sa booking nepokazi.
9. Bez GA/GTM/Meta env sa nezobrazi cookie banner ani sa nenacitaju externe tracking skripty.
10. Live staging smoke vytvori presne jeden test event/lead/email pre jeden submit.

## Co nerobit v stabilizacii

- Neprepisovat wizard na chatbot.
- Nedavat AI rozhodovanie do `POST /api/book`.
- Neposielat PII do GA4/Meta bez consent rozhodnutia.
- Nerobit velky dashboard pred prvymi realnymi leadmi.
- Nemergovat staging-only `ops/openclaw/**` bez samostatneho review, lebo OpenClaw tool layer bol po branch cleanupe explicitne oddeleny.

## Implementacny poriadok

Najbezpecnejsi postup:

```text
1. lead score pure function
2. CRM score write + note
3. attribution campaign IDs + correlation ID
4. priority notification
5. local tests
6. staging env smoke
7. idempotency/rate limiting
8. report/export layer
9. AI follow-up
10. Google/Meta feedback exports
```

Takto sa system posuva na stabilnu uroven bez toho, aby sa zvacsila blast radius kritickej rezervacnej cesty.
