# OpenClaw CRM audit - 2026-06-24

Ucel: zachytit aktualny stav Jakub OpenClaw / CRM vrstvy po branch cleanupe, aby bolo jasne, co realne bezi, co je v databaze a co treba obnovit pred dalsou pracou.

## Overeny stav

OpenClaw Docker gateway bezi.

Kontajner:

```text
openclaw-source-openclaw-gateway-1
image: ghcr.io/openclaw/openclaw:latest
status: Up 8 days, healthy
ports: 3978, 18789, 18890
```

Kontajner je nakonfigurovany pre Jakub tenant:

```text
SUPABASE_TENANT_SLUG=jakub-olsa
SUPABASE_TENANT_NAME=Jakub Olša
SUPABASE_URL=<configured Supabase project>
SUPABASE_SERVICE_ROLE_KEY_FILE=/home/node/.openclaw/secrets/jakub-supabase-service-role-key
```

Service role key je mimo repozitara. Nevypisovat ho do logov, markdownu ani odpovedi.

## Jakub OpenClaw agent

Agent `jakub-olsa` existuje v OpenClaw konfiguracii.

Host workspace:

```text
/Users/xvadur_mac/OpenClaw/workspaces/jakub-olsa
```

Docker runtime workspace:

```text
/home/node/.openclaw/agent-workspaces/jakub-olsa
```

Runtime workspace obsahuje:

```text
AGENTS.md
CRM.md
HEARTBEAT.md
IDENTITY.md
LISTINGS.md
SOUL.md
TOOLS.md
USER.md
WORKFLOWS.md
admin-cases/
media-inbox/
```

Agent pravidla hovoria, ze Jakub agent ma pracovat ako interny maklersky backend pre leady, CRM, follow-upy, fotky, property drafty a staging workflow.

## Supabase CRM

Supabase CRM databaza existuje a odpoveda cez service role key z OpenClaw kontajnera.

Overene tabulky a pocty:

```text
contacts      4
leads         8
appointments 8
notes         9
tasks         4
properties   3
audit_logs    22
media         0
```

Tabulka `bookings` ako samostatna tabulka neexistuje. Booking/rezervacny stav je modelovany cez `appointments` a naviazane `leads`, `contacts`, `notes`, `tasks`.

Overene stlpce:

```text
contacts:
id, tenant_id, name, phone, email, source, notes_summary, raw_payload, deleted_at, created_at, updated_at

leads:
id, tenant_id, contact_id, intent, status, location, location_place_id, property_type, budget, time_horizon, source, qualification_score, next_follow_up_at, raw_payload, deleted_at, created_at, updated_at

appointments:
id, tenant_id, contact_id, lead_id, google_event_id, starts_at, ends_at, status, qualification_payload, source, created_at, updated_at

notes:
id, tenant_id, entity_type, entity_id, author_type, body, source, created_at

tasks:
id, tenant_id, lead_id, title, status, due_at, assigned_to, created_at, updated_at, property_id

properties:
id, tenant_id, lead_id, title, slug, listing_type, status, address, location, price_text, transaction_price, description, short_note, source_text, created_from, published_url, raw_payload, deleted_at, created_at, updated_at

audit_logs:
id, tenant_id, actor_type, actor_id, action, entity_type, entity_id, before, after, created_at
```

## Rozbity clanok po branch cleanupe

OpenClaw runtime dokumentacia ocakava deterministicke tooly v mountnutom Jakub Astro repozitari:

```text
/home/node/Jakub_Astro/ops/openclaw/tools/supabase-crm.mjs
/home/node/Jakub_Astro/ops/openclaw/tools/supabase-media.mjs
/home/node/Jakub_Astro/ops/openclaw/tools/site-listings.mjs
```

Tieto subory v aktualnom `main` pracovnom strome nie su. Pri spusteni v OpenClaw kontajneri padaju na:

```text
MODULE_NOT_FOUND
```

Dovod: `ops/openclaw/**` bolo staging-only a po branch cleanupe ostalo iba v backup vetve:

```text
backup/staging-before-main-sync-2026-06-24
```

V backup vetve existuju:

```text
ops/openclaw/tools/supabase-crm.mjs
ops/openclaw/tools/supabase-media.mjs
ops/openclaw/tools/site-listings.mjs
ops/openclaw/supabase/SUPABASE_SCHEMA.sql
ops/openclaw/jakub-agent/*
docs/OPENCLAW_TOOL_CONTRACTS_2026-06-03.md
```

## Web booking stav

Aktualny `workers/site-worker.js` riesi:

```text
GET  /api/health
GET  /api/availability
POST /api/book
```

Worker vie pracovat s Google Calendar konfiguraciou, Telegram notifikaciou a priamym Supabase CRM zapisom z `/api/book`.

CRM zapis je server-side a aktivuje sa iba ked ma Worker nastavene:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_TENANT_SLUG
SUPABASE_TENANT_NAME
```

Booking flow zapisuje:

```text
contacts
leads
appointments
notes
```

Ak CRM env nie je nastavene, API vrati `crmStatus: "skipped"` a rezervacia pokracuje. Ak CRM env je nastavene, ale zapis zlyha, API vrati `crmStatus: "failed"` a rezervacia sa stale nepokazi pre pouzivatela. Kriticka cesta zostava booking/kalendár, CRM je server-side evidencia leadu.

Zaver:

```text
OpenClaw + Jakub agent + Supabase CRM existuju a databaza obsahuje testovacie/prevadzkove zaznamy.
Aktualne chyba mountnuty deterministicky tool layer v Jakub_Astro main/staging.
Web booking ma priamy Supabase CRM write path, ale staging/produkcia este potrebuju Cloudflare env/secrets a live insert smoke.
```

## Najblizsie technicke kroky

1. Obnovit `ops/openclaw/**` a `docs/OPENCLAW_TOOL_CONTRACTS_2026-06-03.md` z backup vetvy do aktualnej pracovnej vetvy.
2. Otestovat:

```bash
node /home/node/Jakub_Astro/ops/openclaw/tools/supabase-crm.mjs crm.searchContacts --json '{"query":"test"}'
```

3. Overit, ze tooly nepisu secrety do stdout/logov.
4. Nastavit Cloudflare secret `SUPABASE_SERVICE_ROLE_KEY` a var `SUPABASE_URL` pre staging Worker.
5. Spravit staging live insert smoke s testovacim leadom a overit zaznamy v `contacts`, `leads`, `appointments`, `notes`.
