# System audit - Jakub web, CRM a OpenClaw

Dátum: 6. jún 2026  
Scope: Jakub Astro web, booking wizard, Cloudflare Worker, Supabase CRM, dashboard, OpenClaw Docker agent, Telegram, staging/production bezpečnosť.

## Executive summary

Systém už nie je iba web. Aktuálne existuje funkčné jadro:

```text
Web /rezervacia
  -> Cloudflare Worker /api/book
  -> Google Calendar event
  -> Telegram notification
  -> Supabase CRM records
  -> dashboard lead list cez /api/dashboard/leads
```

OpenClaw runtime tiež reálne beží:

```text
Telegram
  -> Docker OpenClaw gateway
  -> agent jakub-olsa
  -> Jakub Astro repo mount
```

Kritický rozdiel: booking a CRM už fungujú end-to-end, ale OpenClaw ešte nie je plnohodnotne zapojený ako maklérsky agent, pretože mu chýbajú deterministické CRM/tool povrchy a verejný zabezpečený hook zo staging Workera do lokálneho Docker runtime.

Najbližší správny smer nie je robiť ďalší dashboard dizajn. Najprv treba:

1. zamknúť dashboard a dashboard API,
2. aktualizovať OpenClaw identitu/runtime docs podľa novej Supabase reality,
3. vytvoriť alebo sprístupniť CRM tools pre OpenClaw,
4. zapnúť bezpečný OpenClaw handoff zo staging webu,
5. až potom rozširovať dashboard.

## Stav vrstiev

### 1. Web

Stav: funkčný, build prechádza.

Overené:

- `npm run build` prešiel 6. júna 2026.
- Astro build vygeneroval 13 strán vrátane:
  - `/`,
  - `/rezervacia/`,
  - `/dashboard/`,
  - `/dashboard/leady/`,
  - listing detail stránok,
  - `/robots.txt`,
  - `/sitemap.xml`,
  - `/llms.txt`.

Pozitíva:

- Web má jasný funnel na rezerváciu.
- Homepage a listingy sú oddelené od interného dashboardu.
- Staging/production workflow existuje.
- Produkčný dashboard zatiaľ nie je nasadený, production vracia 404 na `/dashboard/leady/`.

Riziká:

- Staging dashboard je verejne dostupný.
- Dashboard texty boli aktualizované 6. júna 2026: verejný staging je demo-only, CRM read mód ostáva vypnutý bez auth.
- Niektoré stránky majú vlastné CSS; global design systém je len rozbehnutý, nie uzavretý.

### 2. Booking wizard

Stav: funkčný.

Overené:

- `GET /api/availability?date=2026-06-20` vracia `mode: "google"`.
- Obsadený test slot `18:30` sa po bookingu vrátil ako `busy`.
- `POST /api/book` prešiel staging smoke testom.

Silné stránky:

- Worker robí druhý Google free/busy check pred vytvorením eventu.
- Booking transakcia je deterministická a nie je závislá na OpenClaw.
- GDPR checkbox je povinný.
- Telegram/OpenClaw sú vedľajšie efekty cez `ctx.waitUntil`.

Otvorené body:

- Google Calendar je stále staging/test nastavenie; treba finálne potvrdiť Jakubov kalendár.
- Klient zatiaľ nedostáva potvrdenie emailom.
- Privacy/GDPR stránka nezodpovedá aktuálnemu flow.
- `BOOKING_MIN_LEAD_MINUTES` je aktuálne `0`; prakticky možno chceme minimálny lead time.

### 3. Cloudflare Worker API

Stav: funkčné staging API.

Endpointy:

- `GET /api/health`
- `GET /api/availability`
- `POST /api/book`
- `GET /api/dashboard/leads`

Overené staging:

```json
{
  "ok": true,
  "service": "jakub-booking-api"
}
```

Supabase lead endpoint:

```json
{
  "ok": true,
  "mode": "supabase",
  "leads": []
}
```

Po smoke teste endpoint vrátil test lead zo Supabase.

Riziká:

- `/api/dashboard/leads` je verejne dostupný na stagingu a vracia PII: meno, telefón, email.
- CORS nie je auth. Curl bez Origin prejde. Toto je správne technicky, ale znamená to, že API route musí mať samostatnú ochranu.
- Worker má všeobecný catch, ktorý vracia error message; pred produkciou pri citlivých routes zvážiť menej detailné chybové odpovede.

### 4. Supabase CRM

Stav: schema spustená, end-to-end zápis overený.

Schema:

```text
ops/openclaw/supabase/SUPABASE_SCHEMA.sql
```

Tabuľky:

- `tenants`
- `users`
- `tenant_users`
- `contacts`
- `leads`
- `properties`
- `deals`
- `appointments`
- `notes`
- `tasks`
- `media`
- `agent_logs`
- `audit_logs`
- `approval_requests`
- `admin_cases`
- `calendar_snapshots`

Smoke test 6. júna 2026:

- booking vytvoril Google Calendar event,
- Worker vrátil `crmStatus: "crm_created"`,
- vytvorené boli CRM záznamy pre tenant/contact/lead/appointment,
- dashboard endpoint načítal lead späť.

Vytvorený test lead:

```text
Supabase Smoke Test
```

Vytvorený staging Google event:

```text
b8e7or7j54maq6arfsct3gt8jg
```

Riziká:

- Test dáta treba vyčistiť, ak nechceme mať smoke lead v CRM.
- Service role key prešiel chatom; odporúčaná rotácia po stabilizácii.
- RLS je zapnuté bez broad anon policies, čo je dobré, ale všetky čítania idú cez service role Worker. Preto Worker routes musia byť zamknuté.
- Zatiaľ sa nezapisuje `audit_logs` pri každom CRM zápise.
- `agent_logs`, `approval_requests`, `tasks`, `properties`, `media` existujú, ale ešte nie sú napojené na reálne tooly/UI.

### 5. Dashboard

Stav: prototyp + jeden reálne napojený modul.

Hotové:

- `/dashboard/leady/` fetchuje `/api/dashboard/leads`.
- Lead detail drawer funguje.
- Sidebar a dashboard shell existujú.

Nie je hotové:

- `/dashboard/` overview je stále prevažne statické demo.
- Sekcie `OpenClaw`, `Nehnuteľnosti`, `Kalendár`, `Úlohy` sú zatiaľ navigačné/prototypové, nie plnohodnotné moduly.
- Neexistuje auth.
- Neexistuje editácia leadov/statusov/poznámok/taskov.
- Neexistuje approval queue napojená na Supabase.

Bezpečnostný stav:

- Staging `/dashboard/leady/` vracia 200 bez loginu.
- Staging `/api/dashboard/leads` vracia 200 bez loginu a obsahuje osobné údaje.
- Production `/dashboard/leady/` aktuálne vracia 404, čiže produkcia nie je týmto rizikom zasiahnutá.

### 6. OpenClaw runtime

Stav: reálne beží v Docker/Colima.

Overené:

- Docker container `openclaw-source-openclaw-gateway-1` je `healthy`.
- `http://127.0.0.1:18789/healthz` vracia `{"ok":true,"status":"live"}`.
- `http://127.0.0.1:18789/readyz` vracia `{"ready":true}`.
- Agent registry obsahuje:

```text
agentId: jakub-olsa
identityName: Jakub OpenClaw
model: openai/gpt-5.5
workspace: /home/node/.openclaw/agent-workspaces/jakub-olsa
bindings: 1
```

- Telegram pairing queue je prázdna.
- Telegram routing binding existuje:

```text
telegram -> jakub-olsa
```

- OpenClaw config má hooks enabled a allowed agent ids iba `jakub-olsa`.
- `ai.openclaw.keepawake.system` beží cez `caffeinate -ims`.
- `ai.openclaw.docker` LaunchAgent je registrovaný a beží každé 2 minúty.

Manifest / identity source of truth:

Runtime manifest je prakticky kombinácia:

```text
/Users/xvadur_mac/OpenClaw/docker/state/openclaw-config/openclaw.json
/Users/xvadur_mac/OpenClaw/docker/state/openclaw-config/agent-workspaces/jakub-olsa/IDENTITY.md
/Users/xvadur_mac/OpenClaw/docker/state/openclaw-config/agent-workspaces/jakub-olsa/AGENTS.md
/Users/xvadur_mac/OpenClaw/docker/state/openclaw-config/agent-workspaces/jakub-olsa/TOOLS.md
/Users/xvadur_mac/OpenClaw/docker/state/openclaw-config/agent-workspaces/jakub-olsa/USER.md
```

Repo source-of-truth:

```text
ops/openclaw/jakub-agent/IDENTITY.md
ops/openclaw/jakub-agent/AGENTS.md
ops/openclaw/jakub-agent/TOOLS.md
ops/openclaw/jakub-agent/USER.md
ops/openclaw/jakub-agent/HEARTBEAT.md
```

Docs drift:

- `USER.md` stále tvrdí, že CRM backend nie je finálne pripojený. To už nie je pravda.
- Staršie runbooky ešte spomínajú HighLevel ako CRM blocker. Aktuálny CRM smer je Supabase.
- Niektoré portové poznámky v starších runbookoch sú historické; aktuálny host port je `18789`.

### 7. OpenClaw ako maklérsky agent

Zámer je veľmi dobrý a dokumentovaný:

```text
Jakub Telegram
  -> OpenClaw agent jakub-olsa
  -> CRM/Supabase tools
  -> media storage
  -> property draft
  -> staging approval
  -> production až po schválení
```

Čo reálne máme:

- agent identitu,
- Telegram binding,
- Docker runtime,
- repo mount,
- booking handoff kód vo Workeri,
- Supabase databázu,
- tool contracts v dokumentácii.

Čo chýba:

- OpenClaw nemá reálne deterministické Supabase CRM tools.
- Staging Worker nemá `OPENCLAW_HOOK_URL` a `OPENCLAW_HOOK_TOKEN`, čiže deployed booking ešte neposiela payload do OpenClaw.
- Lokálny `/hooks/agent` nie je vystavený cez verejný zabezpečený HTTPS endpoint.
- Nie je implementovaný media storage flow pre Telegram fotky.
- Nie je implementovaný approval queue UI.
- Nie je implementované automatické vytvorenie property draftu z Telegram fotiek/textu.
- Nie je implementovaný dashboard read/write pre tasks/notes/properties.

## P0 - veci, ktoré treba riešiť pred reálnymi klientskymi dátami

### P0.1 Dashboard a dashboard API

Implementované 6. júna 2026: verejný staging dashboard/API je ponechaný dostupný iba v demo móde. `/api/dashboard/leads` na verejnom stagingu nemá vracať Supabase CRM PII, kým nie je zapnutý auth.

Rizikové cesty ostávajú:

```text
https://staging.jakubolsa.sk/dashboard/leady/
https://staging.jakubolsa.sk/api/dashboard/leads
```

Možnosti:

1. Cloudflare Access pred `/dashboard/*` a `/api/dashboard/*`.
2. Dočasný Worker-level bearer/basic auth pre dashboard API a dashboard HTML.
3. Neskôr vlastný login cez Supabase Auth.

Odporúčanie pre teraz: ponechať demo mód a nerobiť ďalší CRM dashboard s reálnymi dátami bez tejto ochrany. Reálne CRM čítanie zapínať až po Cloudflare Access, Worker-level auth alebo Supabase Auth.

### P0.2 Aktualizovať GDPR/privacy stránku

Implementované ako pracovné minimum 6. júna 2026. Finálny právny review ostáva na Jakubovi/BOSEN.

Stránka už má hovoriť o:

- vlastnom rezervačnom wizarde,
- Cloudflare Worker spracovaní,
- Google Calendar API eventoch,
- Supabase CRM databáze,
- Telegram notifikáciách,
- OpenClaw/OpenAI spracovaní,
- internom dashboarde,
- dobe uchovávania leadov,
- právach na výmaz v CRM.

Treba právny review, ideálne cez BOSEN právne zázemie.

### P0.3 Rotácia Supabase service role key

Kľúč prešiel chatom. Nie je v repozitári, ale správna hygiena je:

1. po dokončení setupu vygenerovať nový service role key,
2. nastaviť ho do Cloudflare secret,
3. starý revoke/rotate,
4. skontrolovať staging flow.

### P0.4 Vyčistiť smoke test dáta

Ak nechceme test dáta ponechať:

- zmazať Google Calendar event `b8e7or7j54maq6arfsct3gt8jg`,
- soft-delete alebo odstrániť test lead/contact/appointment/note zo Supabase.

### P0.5 Aktualizovať OpenClaw runtime context

`ops/openclaw/jakub-agent/USER.md` a runtime kópia musia hovoriť pravdu:

- Supabase schema je spustená,
- booking -> Supabase CRM je overený,
- HighLevel nie je aktuálny CRM blocker,
- OpenClaw ešte nemá deterministické CRM tools,
- staging Worker ešte nemá verejný OpenClaw hook.

## P1 - aby OpenClaw začal byť použiteľný maklérsky agent

### P1.1 Vytvoriť deterministické CRM tools

Prvý rez podľa `docs/OPENCLAW_TOOL_CONTRACTS_2026-06-03.md`:

- `crm.searchContacts`
- `crm.createContact`
- `crm.createLead`
- `crm.createAppointment`
- `crm.addNote`
- `crm.createTask`
- `ops.writeAgentLog`
- `ops.createAdminCase`

Technické možnosti:

1. OpenClaw tool plugin s prístupom do Supabase.
2. Cloudflare Worker interné API pre CRM mutácie, chránené service tokenom.
3. Lokálny Node tool v OpenClaw Docker runtime, ktorý volá Supabase REST.

Odporúčanie: najprv Cloudflare Worker API alebo lokálny Node tool s jasnými allowlisted operáciami. Nie priame voľné SQL.

### P1.2 Verejný bezpečný OpenClaw hook

Aktuálny lokálny hook:

```text
http://127.0.0.1:18789/hooks/agent
```

Cloudflare Worker nemôže volať `localhost`. Treba:

- Cloudflare Tunnel na Mac mini/OpenClaw,
- Cloudflare Access pred hookom,
- staging secrets:
  - `OPENCLAW_HOOK_URL`,
  - `OPENCLAW_HOOK_TOKEN`,
  - prípadne `OPENCLAW_CF_ACCESS_CLIENT_ID`,
  - `OPENCLAW_CF_ACCESS_CLIENT_SECRET`.

Potom booking flow bude:

```text
/api/book
  -> Google Calendar
  -> Supabase CRM
  -> Telegram notification
  -> OpenClaw handoff
```

### P1.3 Telegram command workflow

Treba otestovať reálne vstupy:

```text
Pridaj klienta Novak, chce predať 3 izbový byt v Ružinove, volať zajtra.
```

Očakávaný výsledok:

- contact,
- lead,
- note,
- follow-up task,
- krátke potvrdenie Jakubovi.

Toto teraz agent vie konceptuálne, ale nemá reálny deterministický CRM tool.

### P1.4 Approval workflow

Pre web/listing/media zmeny musí existovať:

- `approval_requests` zápis,
- dashboard/Telegram zobrazenie,
- stav `pending/approved/rejected`,
- build gate,
- staging review link.

Bez toho OpenClaw nesmie robiť verejné mutácie.

### P1.5 Media storage

Telegram fotky nemajú byť primárne dlhodobo v Docker kontajneri.

Potrebný smer:

- Supabase Storage bucket alebo ekvivalent,
- `media` table metadata,
- optimalizované web verzie,
- prepojenie na `properties`.

## P2 - dashboard po systémovej stabilizácii

Po P0/P1 má zmysel robiť dashboard moduly:

1. Lead list a detail - read/write.
2. Tasks/follow-upy.
3. Properties/listing drafts.
4. Appointments/calendar view.
5. Approval queue.
6. OpenClaw agent logs/admin cases.
7. Performance/track record.

Dashboard nemá byť len pekný screen. Má byť operačný panel:

```text
čo je nové
čo treba dnes spraviť
čo čaká na Jakuba
čo čaká na Adama
čo spravil OpenClaw
čo je riziko
```

## Aktuálne rozhodnutie

Systémový stav je dobrý. Máme dosť infraštruktúry na to, aby sa OpenClaw stal maklérskym agentom, ale najbližší krok musí byť bezpečnostný a integračný, nie vizuálny.

Odporúčaný najbližší pracovný poriadok:

1. Zamknúť dashboard/API.
2. Aktualizovať OpenClaw `USER.md` + runtime kópie.
3. Vyčistiť/označiť test dáta.
4. Implementovať prvý CRM tool surface pre OpenClaw.
5. Zapnúť Cloudflare Tunnel + Access pre OpenClaw hook.
6. Otestovať Telegram -> CRM flow.
7. Až potom rozširovať dashboard.
