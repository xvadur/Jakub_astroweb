# Backend system audit - 2026-06-17

Tento audit zachytava aktualny backendovy stav po overeni repozitara, staging endpointov a OpenClaw runtime.

## Verdikt

Backend nie je iba mock. Je to funkcny staging MVP pre realitny booking a zaciatok maklerskeho operacneho systemu.

Funkcne jadro:

```text
rezervacny wizard
  -> Cloudflare Worker
  -> Google Calendar availability/event
  -> Supabase CRM zapis
  -> Telegram notifikacia
  -> OpenClaw handoff
```

Co este nie je hotove: dashboard ako realny pracovny nastroj, tracking/attribution, reviews workflow, monitoring/alerting a finalne produkcne napojenie Jakubovho Google kalendara/mailu.

## Overene 2026-06-17

- Lokalny build presiel cez `npm run build`.
- Staging `/api/health` vracia `ok: true`.
- Staging `/api/availability` bezi v Google mode.
- Dashboard endpoint `/api/dashboard/leads` je verejne v demo mode, nie v CRM/PII mode.
- OpenClaw tunnel health `https://openclaw.jakubolsa.sk/healthz` vracia `{"ok":true,"status":"live"}`.
- Docker OpenClaw gateway `openclaw-source-openclaw-gateway-1` je healthy.
- Docker runtime vie spustit Supabase CRM tool.
- Read-only `crm.searchContacts` z Docker runtime vratil `ok: true`.
- Listing audit z Docker runtime vratil `ok: true`, bez duplicit a bez chybajucich povinnych poli/fotiek.

## Aktualny stav podla vrstiev

### Booking a kalendar

Stav: funkcne v staging/test rezime.

- Wizard komunikuje s Workerom.
- Worker robi availability cez Google Calendar `freeBusy`.
- Worker pri submit-e robi druhy free/busy check.
- Worker vytvara Google Calendar event, ked su secrets nastavene.
- Adam overil tvorbu eventov a komunikaciu wizardu s kalendarom na svojom Google ucte.
- Pending externy krok: osobne stretnutie s Jakubom a napojenie jeho Google credentials, kalendara a mailu.

### Telegram notifikacie

Stav: pripravene ako priamy post-booking signal.

- Po uspesnom `/api/book` ma Worker poslat Telegram notifikaciu.
- Telegram nie je kriticka cast booking transakcie. Ak zlyha, booking moze ostat accepted.
- Treba este kontrolovany staging E2E test: web booking -> Calendar -> Supabase -> Telegram -> OpenClaw.

### Supabase CRM

Stav: schema a zapisove jadro existuju.

- Worker vie vytvorit `contact`, `lead`, `appointment` a `note`.
- Schema obsahuje aj `tasks`, `properties`, `media`, `agent_logs`, `audit_logs`, `approval_requests`, `admin_cases`.
- RLS je zapnute a browser nema service role pristup.
- Chyba plne produktove pouzitie tabuliek v dashboarde a agent workflowoch.

### Dashboard

Stav: prototyp, nie hotovy produkt.

- `/dashboard/` je staticky overview prototyp.
- `/dashboard/leady/` ma staticke fallback data a vie nacitat `/api/dashboard/leads`.
- `/api/dashboard/leads` vie vratit CRM data az po zapnuti CRM read modu a Cloudflare Access allowliste.
- Verejny staging ostava demo-only, kym nie je hotova auth vrstva.

Dashboard treba dorobit ako pracovny cockpit:

- leads list + lead detail,
- statusy, poznamky, follow-up tasky,
- appointments/calendar view,
- properties/listing/media inbox,
- approval queue,
- agent logs/admin cases,
- review requests,
- attribution a lead source pohlad.

### OpenClaw

Stav: runtime zije, tooly su pripravene, treba operacne uzavretie.

- Docker gateway je healthy.
- Cloudflare Tunnel hostname existuje.
- OpenClaw CRM tool existuje a vie read-only komunikovat so Supabase.
- Listing/property tool funguje.
- Media tool existuje pre Telegram/local file -> Supabase Storage/media/property draft.
- Chyba jednotna monitorovacia vrstva a dashboard/API pre agent status, failed runs a admin cases.

### Monitoring foundation

Stav: zaklad existuje.

- `ops/monitoring/jakub-health-check.mjs` robi iba GET health checks bez secretov.
- Defaultne kontroluje staging `/api/health`, produkcny `/api/health` a OpenClaw public `/healthz`.
- Vystup je JSON vhodny pre buduci Adamov globalny dashboard: `service`, `url`, `ok`, `status`, `latency_ms`, `checked_at`.
- Volitelne vie cez env pridat lokalny Docker OpenClaw `/healthz`.

### SEO, AI search a crawlability

Stav: zaklad existuje, marketingova vrstva chyba.

Existuje:

- `robots.txt`,
- `sitemap.xml`,
- `llms.txt`,
- canonical meta,
- OpenGraph meta,
- schema.org pre `Person`, `RealEstateAgent`, `WebSite`, `Service` a listing detail.

Chyba:

- Google Search Console / sitemap submit,
- produkcna kontrola indexacie,
- seller-intent landing pages,
- FAQ sekcie a `FAQPage` structured data,
- breadcrumbs structured data,
- lokalne predajne clustre pre Bratislavu/Ruzinov/Stare Mesto/Petrzalka,
- AI-search orientovane odpovede na realne otazky predavajucich.

### Analytics, reklama a attribution

Stav: nie je hotove.

Potrebujeme zachytit odkial lead prisiel a preniest to cez cely system:

- `utm_source`,
- `utm_medium`,
- `utm_campaign`,
- `utm_content`,
- `utm_term`,
- referrer,
- landing page,
- first seen path,
- booking page path,
- ad/campaign id, ak bude dostupne,
- conversion event id,
- lead id,
- calendar event id,
- neskor listing agreement / sale outcome.

Minimum pre reklamu:

- UTM capture vo wizard-e.
- Ulozenie attribution do `raw_payload` leadu.
- Poslanie attribution do Telegram/OpenClaw handoff payloadu.
- Conversion event na successful booking.
- Cookie/legal rezim podla zvoleneho analytics stacku.

### Google reviews workflow

Stav: databazovy zaklad existuje v schema navrhu ako `review_requests`; runtime odosielanie a dashboard/API este chyba.

Potrebujeme system, ktory vie:

- po uzavreti obchodu alebo milestone vytvorit review request,
- priradit ho ku klientovi/leadu/dealu/property,
- drzat status: draft, approved, sent, responded, skipped,
- ulozit text spravy, kanal a Google review URL,
- auditovat schvalenie cez `approval_requests`,
- poslat klientovi Google review link az po Jakubovom schvaleni alebo jasnom pravidle.

V1 pouziva samostatnu tabulku `review_requests`, naviazanu na `approval_requests`. Pred aplikovanim na existujucu Supabase databazu treba schema spustit ako migraciu a overit, ze ziadna starsia tabulka s tymto nazvom nema iny tvar.

### Rate limiting a anti-spam

Traffic nebude velky, ale verejny booking endpoint vytvara realne calendar/CRM side effects.

V1 minimum:

- zachovat honeypot,
- ponechat payload size limit,
- pridat Turnstile alebo jednoduchy per-IP/per-phone cooldown pred reklamou,
- alert pri nezvycajnom pocte booking pokusov.

## P0 - backend stabilizacia

- [ ] Prepojit Jakubov Google Calendar a mail.
- [ ] Spravit kontrolovany staging E2E test: booking -> Calendar -> Supabase -> Telegram -> OpenClaw.
- [ ] Potvrdit, ze Telegram notifikacia po web bookingu chodi na spravny chat.
- [x] Pridat log/admin case pri zlyhani Telegram/OpenClaw side effectu.
- [ ] Zamknut dashboard a dashboard API cez Cloudflare Access.
- [ ] Az potom zapnut `DASHBOARD_DATA_MODE=crm`.
- [ ] Zosuladit staging/production secrets stav v dokumentacii.

## P1 - lead engine a reklama

- [x] UTM/referrer/landing capture vo wizard-e.
- [x] Ulozit attribution do Supabase lead `raw_payload`.
- [x] Poslat attribution do Telegram a OpenClaw payloadu.
- [x] Pridat booking conversion event.
- [x] Vybrat analytics stack a cookie/legal rezim.
- [ ] Pripravit prvu seller-intent landing page.
- [ ] Dodat FAQ schema a seller FAQ sekciu.

## P2 - dashboard ako pracovny nastroj

- [ ] Lead detail s poznamkami a taskami.
- [ ] Status pipeline.
- [ ] Follow-up queue.
- [ ] Appointment/calendar pohlad.
- [ ] Properties/media inbox.
- [ ] Approval queue.
- [ ] Agent logs/admin cases.
- [ ] Review request panel.

## P3 - AI agent makler

- [ ] Telegram -> OpenClaw -> Supabase CRM workflow pre novy kontakt.
- [ ] Telegram -> OpenClaw -> property/media draft workflow.
- [ ] Agent vytvara follow-up tasky a admin cases.
- [ ] Agent ziadosti o approval zapisuje do databazy.
- [ ] Jakub schvaluje citlive/verejne akcie.
- [ ] Adamov globalny monitoring cita agent health, failed runs, admin cases a web/API status.
