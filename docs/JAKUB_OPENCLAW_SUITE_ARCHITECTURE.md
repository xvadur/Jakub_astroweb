# Jakub OpenClaw Suite Architecture

Status: návrh V1 po discovery interview  
Dátum: 2026-05-29  
Owner: Adam / Xvadur  
Pilot klient: Jakub Olša, realitný maklér  
Súvisiaci web: `jakubolsa.sk`

## Súhrn Po Interview

Po discovery rozhovore je jasné, že nejde len o doplnok ku webu. Jakub potrebuje osobný operačný systém pre realitnú prácu:

- prijímať a triediť leady,
- držať klientov, nehnuteľnosti, poznámky a follow-upy,
- vedieť z fotiek a hlasoviek pripraviť draft inzerátu alebo referenčného predaja,
- vedieť rezervovať telefonát podľa reálnej dostupnosti v Google Kalendári,
- mať jednoduchý dashboard,
- nemiešať Jakubovu dennú prácu s technickým adminovaním.

Najsilnejší produktový tvar je:

```text
Jakub komunikuje cez Telegram.
OpenClaw rozumie zámeru.
Deterministické tooly zapisujú do CRM, kalendára, webu a logov.
Adam rieši iba infraštruktúru, chyby a rozvoj platformy.
```

Toto je zároveň pilot pre ďalších realitných klientov. Web `jakubolsa.sk` je prezentačná a konverzná vrstva. OpenClaw suite má byť pracovný backend.

## Cieľ

Cieľ nie je len web pre realitného makléra. Cieľ je pilotný **OpenClaw broker suite**:

> Kubo, pošli hlasovku, fotku, správu alebo poznámku a systém to zaradí do CRM, kalendára, nehnuteľnosti, follow-upu alebo content enginu.

Jakub má zostať v prirodzenom pracovnom režime:

- komunikuje cez Telegram,
- používa Google Calendar ako hlavný pracovný návyk,
- posiela fotky, hlasovky, poznámky a texty,
- nemusí riešiť technické pojmy ako Git, Supabase, Cloudflare, API alebo OpenClaw config.

OpenClaw má byť neviditeľný operačný backend medzi Jakubom, webom, CRM, kalendárom a neskôr emailom/marketingom.

## Kontext Zistený Z Interview

Jakub dnes nemá vlastný pevný systém. Veľa práce drží v hlave, v poznámkach a v kalendári. Bosen mu poskytuje realitný servis a evidenciu, ale nie osobný operačný systém pre každodenné riadenie práce.

Adam chce Jakubovi postaviť vlastný tenant/workspace, ktorý bude najprv bežať v Adamovej OpenClaw infraštruktúre. Jakub bude vlastník svojich dát a práce. Adam bude platformový admin, ktorý rieši chyby, infraštruktúru, skilly a eskalácie.

Pre Jakuba má byť produkt jednoduchý:

```text
Telegram bot -> OpenClaw agent -> CRM / kalendár / web / dashboard
```

Pre Adama je to pilotná šablóna pre realitnú vertikálu:

```text
OpenClaw broker suite -> Jakub pilot -> Bosen/network -> ďalší makléri
```

## Produktové Princípy

1. Jakub nesmie musieť rozmýšľať ako admin.
2. Telegram je primárny ovládací panel.
3. Google Calendar je pravda o čase a dostupnosti.
4. Supabase je pravda o obchodných dátach.
5. Astro/GitHub/Cloudflare je zatiaľ pravda o verejnom webe.
6. Agent môže pripravovať veľa vecí, ale verejný web, emaily a kalendárne zásahy idú cez schválenie alebo jasne definované pravidlá.
7. Každý zásah agenta musí zanechať stopu: log, audit, alebo admin case.
8. V1 má byť použiteľné demo, nie dokonalý enterprise systém.

## V1 / V2 Rozdelenie

### V1: demo a prvá produkčná prevádzka

V1 môže bežať na Mac mini v Dockeri pod Adamovou kontrolou. Dáta nemajú byť viazané na lokálny disk; CRM a media metadata majú ísť do Supabase.

V1 musí ukázať:

- Telegram agenta pre Jakuba,
- Supabase CRM,
- ukladanie fotiek a textov k nehnuteľnostiam,
- automatizovanú prípravu zmeny webu,
- build gate,
- schvaľovací krok,
- commit/push na GitHub,
- Cloudflare deploy/review link,
- booking wizard napojený na kalendár aspoň v základnej forme,
- alert Adamovi pri zlyhaní.

### V2: platforma pre ďalších klientov

V2 má posunúť pilot do opakovateľného systému:

- samostatný VPS/control plane,
- admin agent, ktorý vie zakladať tenantov,
- izolované workspaces,
- per-tenant credential management,
- šablóna CRM + dashboard + booking wizard,
- možnosť pridať ďalšieho makléra/domov seniorov bez ručného kopírovania projektu.

## Non-goals Pre V1

Tieto veci netreba tlačiť do prvého funkčného dema:

- vlastný open-source calendar systém ako náhrada Google Calendar,
- plne autonómne publikovanie bez review,
- komplexná emailová automatizácia,
- multi-tenant billing,
- perfektný admin portál pre Adama,
- kompletný marketing content engine.

Ak bude V1 úspešná, tieto časti sa dajú dopĺňať postupne.

## Rozhodnutia Z Interview

| Oblasť | Rozhodnutie |
| --- | --- |
| V1 scope | Telegram agent + CRM + správa ponúk/predajov na webe cez draft/schválenie. |
| Agent setup | V1 manuálne: Adam pripraví Jakub agent/workspace, otestuje, resetne, potom Jakub prejde onboarding. V2: admin agent vytvorí tenant automaticky. |
| Dáta | Supabase cloud ako hlavná databáza. |
| Vlastníctvo | Jakub obsluhuje vlastný web a databázu cez agenta. Adam rieši chyby a infra. |
| Web V1 | OpenClaw priamo mení Astro repo, spustí build, commit/push a pošle review link. |
| Web cieľovo | Neskôr prejsť na Supabase-driven web, kde web číta publikované dáta z DB. |
| Publikovanie | Agent spracuje materiály a vypýta si povolenie. Verejné zmeny sú schvaľované. |
| Review flow | Agent po deployi pošle review link, čaká na komentár, iteruje, pri zlyhaní uloží admin case. |
| CRM | Plnohodnotné maklérske CRM: klienti, leady, nehnuteľnosti, obhliadky, ponuky, predaje, tasks, notes. |
| Mazanie | Jakub môže mazať z UI, technicky soft-delete + audit log + možnosť obnoviť. |
| Dashboard | V1 read-only: obraty, počty klientov, udalosti, briefingy, stav webu, logy. |
| Booking | OpenClaw-backed booking wizard s lead qualification, calendar checkom, eventom a CRM payloadom. |
| Kalendár | Google Calendar je pravda o dostupnosti. Wizard povoľuje/zamieta sloty podľa kalendára. |
| Alerty | Pri zlyhaní ide Telegram/OpenClaw alert Adamovi. |
| Pilot infra | V1 môže bežať na Mac mini v Dockeri. Dáta majú byť v Supabase, nie primárne lokálne. |

## V1 Architektúra

```text
Jakub cez Telegram
  hlasovky / text / fotky / poznámky
        |
        v
Telegram Bot API
        |
        v
OpenClaw Gateway / Jakub Agent Workspace
        |
        +--> Executive Agent
        |      rozpozná zámer, deleguje subagentom/toolom
        |
        +--> CRM Tools
        |      contacts, leads, tasks, notes, follow-upy
        |
        +--> Listing/Web Tools
        |      fotky, property draft, Astro repo edit, build, push
        |
        +--> Booking Tools
        |      Google Calendar availability, booking event, CRM payload
        |
        +--> Dashboard/Briefing Tools
        |      read-only prehľad, obraty, udalosti, logy
        |
        +--> Admin Guard
               logs, admin cases, alert Adamovi

Supabase Cloud
  CRM / media metadata / bookings / audit logs

Google Workspace
  Calendar / neskôr Gmail / Drive

Astro Web Repo
  jakubolsa.sk source, fotky, listing dáta

Cloudflare
  public web deploy
```

## OpenClaw Roly

### Adam Admin Agent

Úloha:

- vytvára a spravuje klientské workspaces,
- monitoruje admin cases,
- dostáva alerty,
- opravuje infraštruktúru,
- pridáva a aktualizuje skilly/tooly.

Nie je denný operátor Jakubových obchodných dát.

### Jakub Executive Agent

Úloha:

- je hlavný vstup pre Jakuba cez Telegram,
- chápe hlasovky/text/fotky,
- rozhoduje, či ide o lead, klienta, termín, nehnuteľnosť, web, poznámku alebo follow-up,
- volá deterministické tooly,
- loguje prácu,
- pýta schválenie pri verejných alebo citlivých akciách.

### Subagenti / Lanes

Vo V1 môžu byť implementované ako promptované lanes a tools, nie nutne trvalé samostatné agent identity.

| Lane | Úloha |
| --- | --- |
| CRM Agent | kontakty, leady, poznámky, statusy, follow-upy |
| Listing Agent | ponuky, predaje, referencie, texty na web |
| Media Agent | príjem fotiek, storage, optimalizácia, galérie |
| Booking Agent | wizard, kalendár, availability, event creation |
| Dashboard Agent | briefingy, prehľady, metriky, posledné akcie |
| Admin Guard | audit, approval, admin cases, alerting |

## OpenClaw Capabilities Použiteľné Pre Tento Projekt

Z aktuálnej OpenClaw dokumentácie a CLI vyplýva, že projekt stojí na týchto podporovaných povrchoch:

- `agents` a agent workspaces,
- `channels`, hlavne Telegram,
- `plugins` a typed agent tools,
- `webhooks`,
- `cron` / background tasks,
- `subagents`,
- `memory` / workspace files,
- `secrets`,
- `tasks`,
- TTS/ElevenLabs neskôr,
- media handling.

Relevantné dokumentačné plochy:

- Agents: `https://docs.openclaw.ai/cli/agents`
- Telegram: `https://docs.openclaw.ai/channels/telegram`
- Agent workspace: `https://docs.openclaw.ai/concepts/agent-workspace`
- Sub-agents: `https://docs.openclaw.ai/tools/subagents`
- Tool plugins: `https://docs.openclaw.ai/plugins/tool-plugins`
- Webhooks plugin: `https://docs.openclaw.ai/plugins/reference/webhooks`
- Scheduled tasks: `https://docs.openclaw.ai/automation/cron-jobs`

## Supabase Schema Draft

V1 má byť Supabase cloud. Mac mini nemá byť primárny dátový sklad. Mac mini/Docker beží runtime, agentov a tooling.

### Core

```text
tenants
  id
  slug
  name
  owner_user_id
  created_at

tenant_users
  id
  tenant_id
  user_id
  role
  created_at

users
  id
  name
  email
  telegram_id
  role
```

### CRM

```text
contacts
  id
  tenant_id
  name
  phone
  email
  source
  notes_summary
  deleted_at
  created_at
  updated_at

leads
  id
  tenant_id
  contact_id
  intent                -- sell / buy / rent / consult / unknown
  status                -- new / qualified / contacted / meeting / won / lost / archived
  location
  property_type
  budget
  time_horizon
  source
  qualification_score
  next_follow_up_at
  deleted_at
  created_at
  updated_at

notes
  id
  tenant_id
  entity_type           -- contact / lead / property / booking / task
  entity_id
  author_type           -- jakub / agent / adam / system
  body
  source                -- telegram / dashboard / webhook / import
  created_at

tasks
  id
  tenant_id
  lead_id
  title
  status                -- open / done / cancelled
  due_at
  assigned_to
  created_at
```

### Properties / Listings

```text
properties
  id
  tenant_id
  title
  slug
  listing_type          -- offered / sold_reference
  status                -- draft / review / published / archived
  address
  location
  price_text
  transaction_price
  description
  short_note
  source_text
  created_from          -- telegram / dashboard / import
  published_url
  deleted_at
  created_at
  updated_at

property_media
  id
  tenant_id
  property_id
  storage_path
  original_filename
  media_type
  sort_order
  caption
  created_at
```

### Booking / Calendar

```text
bookings
  id
  tenant_id
  contact_id
  lead_id
  google_event_id
  starts_at
  ends_at
  status                -- requested / confirmed / cancelled / rescheduled / no_show
  qualification_payload
  source
  created_at

calendar_snapshots
  id
  tenant_id
  provider
  calendar_id
  sync_started_at
  sync_finished_at
  busy_payload
```

### Agent Ops / Audit

```text
agent_logs
  id
  tenant_id
  agent_id
  run_id
  action
  summary
  status                -- started / succeeded / failed / waiting_for_approval
  payload
  created_at

audit_logs
  id
  tenant_id
  actor_type            -- jakub / adam / agent / system
  actor_id
  action
  entity_type
  entity_id
  before
  after
  created_at

approval_requests
  id
  tenant_id
  requested_by_agent_id
  action_type
  summary
  payload
  status                -- pending / approved / rejected / expired
  approved_by
  created_at
  resolved_at

admin_cases
  id
  tenant_id
  severity
  title
  description
  failed_run_id
  status                -- open / investigating / resolved
  created_at
  resolved_at
```

## Tool Plugin Draft

Projekt potrebuje vlastný OpenClaw tool plugin, pracovný názov:

```text
openclaw-plugin-jakub-reality
```

Minimálne tooly:

```text
crm.createContact
crm.createLead
crm.updateLead
crm.searchContacts
crm.addNote
crm.createTask

property.createDraft
property.attachMedia
property.updateDraft
property.publishToAstro
property.archive

media.saveTelegramPhoto
media.optimizeForWeb
media.createGallery

booking.getAvailability
booking.createQualifiedBooking
booking.cancelBooking
booking.syncCalendarBusy

web.pullRepo
web.editSiteData
web.runBuild
web.commitAndPush
web.getReviewUrl

ops.createApprovalRequest
ops.writeAgentLog
ops.createAdminCase
ops.alertAdam
```

Pravidlo: agent môže rozhodovať, ale mutácie idú cez pevné tooly.

## Flow 1: Fotky + Hlasovka -> Listing / Referenčný Predaj

Toto je must-have demo.

```text
Jakub pošle Telegram fotky + hlasovku/text
  -> Executive Agent rozpozná intent
  -> Media tool uloží fotky
  -> Listing Agent vytiahne fakty z popisu
  -> property.createDraft uloží draft do Supabase
  -> property.publishToAstro pripraví zmenu v Astro repo
  -> web.runBuild overí build
  -> agent požiada Jakuba o povolenie
  -> po schválení web.commitAndPush
  -> Cloudflare deploy
  -> agent pošle review link
  -> Jakub dá komentár
  -> agent iteruje alebo založí admin case
```

Bezpečnostné pravidlá:

- ak build zlyhá, agent nesmie pushnúť,
- ak nevie zaradiť listing do kategórie, pýta sa,
- ak chýba cena/adresa/status, pýta sa,
- verejný web sa nemení bez explicitného potvrdenia.

## Flow 2: Booking Wizard -> Lead Qualification -> Calendar Event

Booking wizard nie je iba výber času. Má robiť lead qualification.

```text
Klient otvorí booking wizard na webe
  -> vyberie zámer: predaj / kúpa / prenájom / konzultácia
  -> doplní kontakt a základné info
  -> wizard zavolá booking availability endpoint
  -> backend overí Google Calendar busy/free
  -> klient vyberie dostupný slot
  -> createQualifiedBooking:
       - uloží contact
       - uloží lead
       - uloží booking
       - vytvorí Google Calendar event
       - vytvorí poznámku
       - pošle Telegram notifikáciu Jakubovi
       - pošle potvrdenie klientovi
```

Google Calendar pravidlá ešte treba uzavrieť:

- hlavný kalendár,
- dĺžka hovoru,
- buffer pred/po hovore,
- pracovné hodiny,
- či busy event blokuje všetko,
- ako Jakub označí `phone off` / blokované sloty.

## Flow 3: CRM Poznámka / Lead

```text
Jakub pošle:
"Pridaj klienta Novák, chce predať 3 izbák v Ružinove, volať zajtra."

Executive Agent:
  -> CRM intent
  -> crm.createContact
  -> crm.createLead
  -> crm.createTask / follow-up
  -> crm.addNote
  -> agent potvrdí Jakubovi stručné zhrnutie
```

## Dashboard V1

Dashboard má byť na Jakubovej doméne ako read-only real estate dashboard.

Prvé karty:

- dnešné udalosti,
- najbližšie follow-upy,
- nové leady,
- aktívne leady podľa statusu,
- publikované ponuky,
- referenčné predaje,
- odhadované/uzavreté obraty,
- posledné agent akcie,
- otvorené admin cases.

Dashboard je prehľad a kontrola. Hlavné ovládanie ostáva Telegram.

## Credential Strategy

Credentialy nesmú byť v repozitári ani v agent memory súboroch.

Potrebné credentialy:

- Telegram bot token pre Jakuba,
- Supabase URL + service role / scoped key,
- Google OAuth credentials pre Calendar/Gmail,
- GitHub token alebo deploy key pre Astro repo,
- Cloudflare token iba ak bude treba mimo GitHub deploy,
- model provider keys,
- prípadne ElevenLabs key.

V1 môže bežať v Adamovom OpenClaw, ale Jakub credentialy musia byť tenant-scoped.

Po testovaní s Adamovými credentialmi musí prebehnúť reset:

```text
wipe sessions
wipe runtime memory
wipe logs/cache podľa potreby
remove Adam credentials
load Jakub bootstrap
add Jakub credentials
run Jakub onboarding
```

## Onboarding Flow

### Adam technický onboarding

1. Vytvorí Jakub workspace.
2. Pripojí test credentialy.
3. Otestuje Telegram, Supabase, repo automation, build.
4. Resetne runtime stav.
5. Pridá Jakub credentialy.
6. Spustí Jakub onboarding.

### Jakub onboarding cez Telegram

Agent sa pýta:

- Ako ťa mám oslovovať?
- Aký je tvoj hlavný pracovný kalendár?
- Kedy štandardne prijímaš telefonáty?
- Ako označuješ blokovaný čas?
- Aké typy klientov riešiš?
- Čo je pre teba kvalifikovaný lead?
- Aké lokality riešiš?
- Aký tón má mať web?
- Čo nikdy neposielať/publikovať bez schválenia?
- Kam posielať urgentné notifikácie?

Výsledok sa uloží do user/profile dát a workspace memory.

## Implementačné Fázy

### Fáza 0: Dokumentácia a rozhodnutia

- Tento dokument.
- Doplniť otvorené body.
- Pripraviť implementačný checklist pre OpenClaw.

### Fáza 1: Jakub Agent Workspace

- Vytvoriť workspace.
- Telegram channel.
- Bootstrap prompt.
- Agent log.
- Admin alert Adamovi.

### Fáza 2: Supabase CRM

- Schema.
- RLS/tenant boundaries alebo server-side scoped API.
- Soft delete.
- Audit log.
- Basic CRUD tools.

### Fáza 3: Listing/Web Automation

- Media save.
- Astro repo edit.
- Build gate.
- Approval request.
- Commit/push.
- Review link.

### Fáza 4: Booking Wizard

- Web wizard UI.
- Google Calendar free/busy.
- Booking API/tool.
- CRM lead qualification payload.
- Calendar event.
- Notifikácie.

### Fáza 5: Dashboard

- Read-only dashboard.
- CRM metrics.
- Calendar overview.
- Agent logs.
- Admin cases.

## Otvorené Body

Tieto veci treba ešte rozhodnúť pred implementáciou:

1. Presný názov a umiestnenie OpenClaw tenant/workspace adresárov.
2. Supabase projekt: nový projekt pre Jakuba alebo shared multi-tenant projekt.
3. Google Calendar OAuth setup: Jakubov osobný Gmail alebo Google Workspace účet.
4. Booking slot pravidlá: dĺžka hovoru, buffer, pracovné hodiny.
5. Telegram bot: jeden bot pre Jakuba alebo per-tenant bot model.
6. Ako bude vyzerať review link pred/po Cloudflare deployi.
7. Či dashboard bude samostatná app alebo časť existujúceho Astro webu.
8. Kde držať originálne fotky vs optimalizované web fotky.
9. Či vo V1 riešiť Gmail, alebo až po CRM/listing/booking.
10. Ako dlho držať agent logs a ako ich čistiť.
11. Presná forma booking wizardu: otázky, obrazovky, validácie, copywriting.
12. Či Jakub bude mať jeden hlavný kalendár alebo viac kalendárov.
13. Ako sa bude mapovať kalendárny event na lead/booking v Supabase.
14. Či review link bude produkčný deploy, preview deploy alebo samostatná staging doména.
15. Aký presný payload má dostať Adam pri admin case.

## Najbližšie Potrebné Dopĺňanie

Pred implementáciou treba vytvoriť tieto samostatné pracovné dokumenty alebo issue/checklisty:

1. `OPENCLAW_BOOTSTRAP_PROMPT.md` - systémový prompt Jakub agenta.
2. `SUPABASE_SCHEMA.sql` - prvý návrh tabuliek, indexov, RLS alebo server-side access pravidiel.
3. `BOOKING_WIZARD_SPEC.md` - otázky, slot pravidlá, event payload a notifikácie.
4. `OPENCLAW_TOOL_CONTRACTS.md` - presné vstupy/výstupy každého toolu.
5. `AGENT_APPROVAL_POLICY.md` - čo môže agent robiť sám a čo iba po schválení.
6. `DEMO_SCRIPT.md` - presný scenár na ukážku Jakubovi.

## Riziká

| Riziko | Opatrenie |
| --- | --- |
| Agent rozbije web | Povinný build gate pred pushom. |
| Agent publikuje zlý obsah | Approval pred verejnou zmenou. |
| Zmiešanie Adam/Jakub credentialov | Tenant-scoped secrets a reset protokol. |
| Google OAuth sa zasekne | Izolovať ako samostatný milestone. |
| Telegram fotky sú veľké/neprehľadné | Media tool s namingom, storage pathmi a optimalizáciou. |
| Jakub zmaže dôležitý lead | Soft-delete + audit + restore. |
| Mac mini vypadne | Supabase drží dáta; runtime sa dá obnoviť. |
| Agent nevie pokračovať | Admin case + Telegram alert Adamovi. |

## Definícia Úspešného Pilotu

Pilot je úspešný, keď Jakub vie cez Telegram spraviť aspoň tieto veci:

1. Pridať lead/klienta s poznámkou a follow-upom.
2. Poslať fotky a popis nehnuteľnosti.
3. Dostať od agenta pripravený listing alebo referenčný predaj.
4. Schváliť publikovanie na web.
5. Dostať review link.
6. Mať lead a nehnuteľnosť uloženú v CRM.
7. Vidieť základný dashboard.
8. Dostať notifikáciu pri novom booking/leade.

Toto je dostatočný dôkaz, že OpenClaw môže fungovať ako realitný operačný systém, nie len ako chatbot.
