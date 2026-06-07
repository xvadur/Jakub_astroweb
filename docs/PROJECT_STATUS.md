# Stav projektu Jakub Olša web

Posledná aktualizácia: 6. jún 2026

## Aktuálny stav

Web je pripravený ako prezentačný realitný web pre Jakuba Olšu. Primárny účel prvej verzie je:

- ukázať, kto je Jakub a ako pracuje,
- vysvetliť služby pri predaji, kúpe, prenájme a odhade ceny,
- ukázať referenčné predaje,
- dostať návštevníka ku kontaktu alebo rezervácii konzultácie.

Web je Astro stránka nasadená cez Cloudflare Workers Static Assets. Rezervácia konzultácie je samostatný wizard na `/rezervacia/` s pripraveným Cloudflare Worker API backendom. Kým nie sú nastavené Google secrets, booking API beží v mock režime; po doplnení Google OAuth bude čítať dostupnosť cez Google Calendar `freeBusy` a zapisovať rezervácie cez `events.insert`.

Aktuálna obchodná stratégia je postavená na tom, že Jakub je osobný maklér a BOSEN je jeho servisné zázemie. Web má fungovať ako lead magnet pre predajný audit / predajnú stratégiu, nie ako lacný generický katalóg bytov.

## Čo je hotové

- Migrovaný a uprataný Astro projekt v lokálnej ceste `/Users/xvadur_mac/Jakub_Astro`.
- Stará cesta `/Users/xvadur_mac/Workspace/legacy/code/Jakub_Astro` zostáva ako symlink na hlavnú lokálnu cestu, aby sa nerozbili existujúce odkazy.
- Homepage má novú štruktúru: hero, proof strip, služby, referenčné predaje, proces, princípy práce, kontakt.
- Copywriting bol prepísaný do Jakubovho hlasu, nie ako text od developera alebo tretia osoba.
- Hero komunikuje Jakubovu osobnú cestu: hokej, financie, reality.
- Pridaný vizuálny realitný charakter: portrét, logo, panoráma Bratislavy, tmavý prémiový vizuál.
- Referenčné predaje sú spracované ako samostatné detail stránky.
- Kontakt sekcia ponúka telefonát, emailový formulár a preklik na rezervačný wizard.
- Primárne CTA `Rezervácia konzultácie` smeruje na `/rezervacia/`.
- Ak je v budúcnosti nastavený externý booking link cez `PUBLIC_BOOKING_URL`, môže slúžiť ako doplnkový kalendárový kontakt.
- Footer obsahuje logo, Instagram a link na ochranu údajov.
- Pridané jemné reveal animácie a carousel ovládanie referenčných predajov.
- Privacy stránka bola upravená podľa aktuálneho kontakt/booking modelu.
- Build lokálne prechádza cez `npm run build`.
- Zmeny sú commitnuté a pushnuté do GitHub repozitára `xvadur/Jakub_astroweb`.
- Staging prostredie je aktívne a slúži ako povinný medzikrok pre nové úpravy webu.
- Pripravená je samostatná stránka `/rezervacia/` so statickým rezervačným wizardom: zámer, typ nehnuteľnosti, lokalita, preferovaný dátum/čas a kontakt.
- Rezervačný wizard je pripravený na Google Places autocomplete cez `PUBLIC_GOOGLE_MAPS_API_KEY`, aby sa lokalita vyberala z overených Google návrhov.
- Pripravený je Cloudflare Worker backend:
  - `GET /api/health`,
  - `GET /api/availability?date=YYYY-MM-DD`,
  - `POST /api/book`.
- Wizard už odosiela booking payload na API namiesto priameho `mailto:` flow. Ak API zlyhá, ostáva núdzový email fallback.
- Worker je pripravený na Google Calendar sync, priame Telegram notifikácie a non-blocking OpenClaw handoff cez Cloudflare secrets.
- Produkcia má základnú SEO/AI indexačnú vrstvu:
  - `/robots.txt`,
  - `/sitemap.xml`,
  - `/llms.txt`,
  - canonical URL na homepage, rezervácii, privacy stránke a detailoch nehnuteľností,
  - OpenGraph URL/image metadata.
- Staging build blokuje crawling cez `/robots.txt` a stránky majú `noindex,nofollow,noarchive`.
- Pripravené sú večerné pracovné dokumenty:
  - `docs/MEETING_DEMO_PATH_2026-06-03.md`,
  - `docs/BOSEN_COPY_WORKSHOP_2026-06-03.md`,
  - `docs/LISTING_TEMPLATE_2026-06-03.md`,
  - `docs/OPENCLAW_ONBOARDING_2026-06-03.md`.
- OpenClaw príprava pre Jakuba je rozbehnutá bez ukladania secretov:
  - lokálne vytvorený oddelený agent `jakub-olsa`,
  - workspace `/Users/xvadur_mac/OpenClaw/workspaces/jakub-olsa`,
  - pripravený non-blocking Worker handoff po úspešnom `/api/book`,
  - pripravený agent prompt, user kontext, tool pravidlá, Supabase schema draft a runbook.
- Docker runtime je nainštalovaný user-local cez Docker CLI + Colima a overený cez `hello-world`.
- Docker OpenClaw je od 2026-06-05 aktívny lokálny runtime na `http://127.0.0.1:18789/` s vlastným config/workspace adresárom.
- Docker agent `jakub-olsa` je overený cez `openclaw-cli agent` smoke test a používa `openai/gpt-5.5` cez OpenAI Codex runtime.
- Docker agent core docs sú zosynchronizované v runtime workspace: `USER.md`, `IDENTITY.md`, `AGENTS.md`, `TOOLS.md`, `HEARTBEAT.md`.
- Docker agent `jakub-olsa` má od 2026-06-05 priamy mount na Jakub Astro repo: host `/Users/xvadur_mac/Jakub_Astro` -> container `/home/node/Jakub_Astro`.
- Astro repo connection smoke test cez agenta prešiel: agent odpovedal `CONNECTED`, package `clients-jakub-olsa`, `astro.config.mjs` existuje.
- Host OpenClaw LaunchAgent `ai.openclaw.gateway` je disabled, aby nekolidoval s Docker runtime na porte `18789`.
- Docker OpenClaw LaunchAgent watchdog `ai.openclaw.docker` je enabled. Každé 2 minúty overuje Colima/Docker a `openclaw-gateway`.
- Docker OpenClaw `/hooks/agent` je lokálne zapnutý, chránený bearer tokenom mimo repozitára a obmedzený na agenta `jakub-olsa`.
- Hook smoke test z 2026-06-04 prešiel: neautorizovaný request vracia `401`, autorizovaný request vytvorí `runId` a session `agent:jakub-olsa:main` ukladá odpoveď agenta.
- Lokálny Worker E2E test z 2026-06-04 prešiel: `/api/book` v mock režime odovzdal test booking cez `ctx.waitUntil` do OpenClaw `/hooks/agent` a agent vytvoril interný admin case.
- Staging Worker má od 2026-06-06 nastavené `TELEGRAM_BOT_TOKEN` a `TELEGRAM_CHAT_ID` secrets, takže úspešný `/api/book` vie poslať Jakubovi Telegram oznámenie s detailmi leadu.
- Staging Worker má od 2026-06-06 overenú Supabase CRM integráciu:
  - non-secret konfigurácia je vo `wrangler.toml`,
  - `SUPABASE_SERVICE_ROLE_KEY` je uložený iba ako Cloudflare secret na `jakubastroweb-staging`,
  - `POST /api/book` po úspešnom bookingu skúsi zapísať kontakt, lead, appointment a poznámku do Supabase,
  - `GET /api/dashboard/leads` je pripravený pre dashboard lead databázu, ale verejný staging teraz vracia iba demo dáta,
  - stránka `/dashboard/leady/` sa pokúsi načítať leady z API a verejne má zobrazovať iba demo/test údaje, kým dashboard nie je zamknutý.
- Supabase schema bola spustená v Supabase SQL Editore a staging smoke test prešiel: test booking vytvoril Google Calendar event a Worker vrátil `crmStatus: "crm_created"`.
- Plný OpenClaw handoff z nasadeného staging webu ešte potrebuje verejný HTTPS endpoint pre lokálny Docker `/hooks/agent`, ideálne Cloudflare Tunnel + Access; Cloudflare Worker nesmie dostať `localhost` hook URL.
- OpenClaw má od 2026-06-07 pripravený lokálny deterministický Supabase CRM tool v `ops/openclaw/tools/supabase-crm.mjs` a runtime kópie agent docs sú zosynchronizované do Docker OpenClaw state.
- Aktuálny OpenClaw blocker pre maklérskeho agenta: chýba verejný bezpečný hook/tunnel zo staging Workera do Docker OpenClaw a runtime Supabase service key konfigurácia pre OpenClaw tool. HighLevel `401` z older runbookov je historická stopa, nie aktuálny CRM smer.

## Rozhodnutia

- n8n sa v prvej verzii nepoužíva.
- Rezervačný wizard má ísť cez vlastný Cloudflare Worker backend, nie cez externý Calendly/Appointment Schedule ako primárny funnel.
- Google Calendar bude zdroj pravdy pre dostupnosť. Worker musí pri bookingu urobiť druhý free/busy check, aby sa minimalizoval double-booking.
- CRM-lite sa posúva do vlastného Supabase backendu. V1 web nesmie čítať CRM priamo z browsera cez service role; všetky zápisy/čítania idú cez Cloudflare Worker API.
- Telefonický kontakt zostáva na webe, pretože Jakub ho má aj na Instagrame a pre jeho typ práce dáva zmysel.
- Produkcia sa chráni cez staging workflow: experimenty, OpenClaw mutácie, tracking, booking a lead magnet úpravy idú najprv na `https://staging.jakubolsa.sk/`.
- Cloudflare API tokeny a iné tajomstvá sa nesmú ukladať do repozitára.
- Booking funnel na stagingu už beží v Google Calendar móde cez Cloudflare secrets; aktuálne môže používať Adamov/testovací kalendár, kým sa flow neprepne na Jakubov kalendár.
- Google Maps API kľúč sa nesmie ukladať do repozitára. Musí byť nastavený ako environment variable a obmedzený na povolené domény.
- Google Calendar OAuth secrets a Telegram secrets sa nesmú ukladať do repozitára. Musia ísť do Cloudflare secrets.
- OpenClaw hook URL/token a prípadné Cloudflare Access service tokeny sa nesmú ukladať do repozitára. Najprv sa nastavujú iba na `jakubastroweb-staging`.
- Docker OpenClaw agent model má zostať `openai/gpt-5.5`; provider `openai-codex` nemal zodpovedajúci auth route a spôsoboval zlyhanie agent runu.

## OpenClaw a Telegram stav

Overené 6. júna 2026:

- OpenClaw gateway beží cez Docker/Colima na porte `18789`.
- Host OpenClaw launchd service je vypnutý; aktívny watchdog je `ai.openclaw.docker`.
- Docker agent `jakub-olsa` má routing binding `telegram -> jakub-olsa`.
- Persistent smoke test cez Docker agenta prešiel odpoveďou `PERSISTENT_OK`.
- Telegram bot cieľ je `@jakub_reality_bot` s menom `jakubolsa_reality`.
- Docker Telegram channel je nakonfigurovaný cez tokenFile v Docker OpenClaw state; token a allowlist boli prenesené z MacBook OpenClaw state.
- Docker polling zachytil pending pairing request od Jakuba a pairing bol schválený bez `--notify`; `pairing list` je prázdny.
- Outbound Telegram smoke test z Docker runtime bol poslaný Jakubovi cez OpenClaw message tool 6. júna 2026 (`messageId=19`).
- Cloudflare staging Worker `jakubastroweb-staging` má nastavené Telegram secrets pre priame webové notifikácie po rezervácii.
- Staging API smoke test z 6. júna 2026 prešiel: `/api/health` vracia `ok: true` a `/api/availability?date=2026-06-08` beží v `google` móde s dostupnými slotmi.
- OpenClaw agent docs boli 7. júna 2026 rozšírené o Supabase CRM tool a workflowy:
  - `ops/openclaw/tools/supabase-crm.mjs`,
  - `ops/openclaw/jakub-agent/WORKFLOWS.md`.

Praktický runbook je v `docs/OPENCLAW_TELEGRAM_JAKUB.md`.

## Cloudflare/Wrangler stav

Overené 6. júna 2026:

- Wrangler login na aktuálnom stroji je hotový cez OAuth.
- Cloudflare účet: `yksvadur.ja@gmail.com`.
- Cloudflare account ID: `002b0727daee60448cf72c0b08f7810f`.
- OpenClaw môže používať `npx wrangler ...` cez lokálny macOS user profil, ale samostatný Cloudflare API token nie je uložený v OpenClaw secrets.
- Staging Worker `jakubastroweb-staging` má nastavené secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_CALENDAR_ID`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.
- Staging Worker `jakubastroweb-staging` má nastavený aj `SUPABASE_SERVICE_ROLE_KEY` pre server-side CRM zápisy.
- Produkčný Worker `jakubastroweb` nemal pri kontrole 6. júna 2026 nastavené žiadne secrets; produkciu nastavovať až po potvrdení staging flow.

## Supabase CRM stav

Overené 6. júna 2026:

- Supabase projekt je pripojený cez server-side Worker konfiguráciu.
- Reálne tajomstvá nie sú v repozitári; service role key je iba Cloudflare secret.
- Schema z `ops/openclaw/supabase/SUPABASE_SCHEMA.sql` je spustená v Supabase.
- Worker vie po bookingu vytvoriť:
  - tenant `jakub-olsa`,
  - kontakt,
  - lead,
  - appointment,
  - poznámku z formulára.
- Dashboard endpoint `GET /api/dashboard/leads` vie čítať lead databázu, ale verejný staging je nastavený na `mode: "demo"`, aby neukazoval reálne PII bez auth.
- Worker má ochrannú poistku: ak sa dashboard prepne do CRM módu, `/api/dashboard/leads` vráti Supabase dáta iba pri Cloudflare Access emaili z allowlistu.
- Staging smoke test vytvoril test lead `Supabase Smoke Test` a Google event `b8e7or7j54maq6arfsct3gt8jg`.

Ďalší krok:

- Vyčistiť smoke test dáta, ak nechceme test lead/event držať v staging kalendári a Supabase.
- Pred reálnymi klientskymi dátami zamknúť `/dashboard/*` a `/api/dashboard/*` cez Cloudflare Access alebo vlastnú autentifikáciu a až potom zapnúť CRM read mód.
- Pre OpenClaw runtime nastaviť Supabase service role key cez env alebo secret file mimo repozitára, potom spustiť CRM tool smoke test.

Mac mini prenos je dokumentovaný v `docs/MAC_MINI_HANDOFF.md`.

## Google Calendar OAuth stav

Overené 5. júna 2026:

- Google OAuth Desktop client credentials sú lokálne uložené mimo repozitára v `.secrets/`.
- `gog` pozná OAuth client pod názvom `jakub-calendar`.
- Cieľový Google účet pre Calendar je `jakubolsa90@gmail.com`.
- Jakubov OAuth consent sa zatiaľ nepodarilo dokončiť, takže refresh token pre jeho Calendar ešte nemáme.
- Calendar ID zatiaľ nie je vybrané; po úspešnej autorizácii treba vypísať kalendáre cez `gog calendar calendars`.
- Prenos na iný Mac je dokumentovaný v `docs/GOOGLE_CALENDAR_HANDOFF.md`.

## Cloudflare a doména

Doména: `jakubolsa.sk`

Registrátor: Websupport

Cloudflare nameservery:

- `adele.ns.cloudflare.com`
- `paul.ns.cloudflare.com`

DNSSEC:

- Starý Websupport DS záznam bol odstránený.
- DNSSEC nechávame vypnutý, kým doména nebude stabilne aktívna v Cloudflare.

Cloudflare build:

- Install command: `bun install --frozen-lockfile`
- Build command: `bun run build`
- Output directory: `dist`
- Deploy command pre Workers Builds:

```bash
npx wrangler deploy --config wrangler.toml --name=jakubastroweb
```

Poznámka: ak by sa projekt prepol na Cloudflare Pages namiesto Worker assets deployu, deploy command má byť prázdny a používa sa len output directory `dist`.

## Staging prostredie

Staging workflow je zdokumentovaný v `docs/STAGING_DEPLOYMENT.md`.

Aktívny staging:

- URL: `https://staging.jakubolsa.sk/`
- Worker: `jakubastroweb-staging`
- fallback: `https://jakubastroweb-staging.yksvadur-ja.workers.dev/`
- overené 30. mája 2026: stránka má `noindex,nofollow,noarchive` a viditeľný `STAGING` badge.

Pravidlo:

- `main` je produkcia pre `jakubolsa.sk`,
- `staging` je testovacia vetva,
- staging deploy musí ísť do samostatného workeru `jakubastroweb-staging`,
- staging build má mať `PUBLIC_SITE_ENV=staging`, aby mal `noindex` a viditeľný `STAGING` badge,
- experimentálne zmeny, OpenClaw mutácie, booking wizard, tracking a lead formuláre sa najprv kontrolujú na stagingu.

Staging deploy command:

```bash
PUBLIC_SITE_ENV=staging npm run build
npx wrangler deploy --config wrangler.toml --name=jakubastroweb-staging
```

## Lokálny filesystem

Kanonický lokálny folder projektu je:

```text
/Users/xvadur_mac/Jakub_Astro
```

Všetko, čo patrí k Jakubovmu webu, má byť v tomto foldri. Staré cesty sú len kompatibilné symlinky na rovnaké miesto:

- `/Users/xvadur_mac/Projects/Jakub_Astro`
- `/Users/xvadur_mac/Workspace/legacy/code/Jakub_Astro`
- `/Users/xvadur_mac/Workspace/projects/jakub-astro`

Podrobnosti sú v `docs/FILESYSTEM_LAYOUT.md`.

## Čo treba dokončiť pred ostrým spustením

- Počkať, kým Cloudflare označí `jakubolsa.sk` ako `Active`.
- V Cloudflare DNS odstrániť staré Websupport záznamy, ak ešte existujú:
  - `A @ 37.9.175.132`
  - `A www 37.9.175.132`
- V `Workers & Pages` pripojiť custom domains:
  - `jakubolsa.sk`
  - `www.jakubolsa.sk`
- Pre Google Calendar booking najprv nastaviť staging secrets pre Adamov testovací Google účet:

```bash
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REFRESH_TOKEN
GOOGLE_CALENDAR_ID
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
```

- Pre Supabase CRM spustiť databázovú schemu a držať service role iba v Cloudflare secrets:

```bash
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --name jakubastroweb-staging
```

- Po schválení flow prepnúť Google OAuth secrets na Jakubov Google účet/kalendár.
- Dokončiť Jakubov Google Calendar OAuth consent na cieľovom Macu, ak má OpenClaw/gog alebo Worker zapisovať alebo čítať interný kalendár.
- Overiť, že `/api/availability` vracia obsadené sloty podľa Google kalendára a `/api/book` vytvorí event.
- Skontrolovať stránku na mobile po nasadení na reálnej doméne.
- Skontrolovať SSL/TLS v Cloudflare, ideálne `Full`.
- Potvrdiť s Jakubom telefónne číslo, email, Instagram a povolenie použiť fotky/referencie.
- Skontrolovať právny text ochrany osobných údajov s reálnymi údajmi prevádzkovateľa.

## Neskôr

- CRM-lite: rozšíriť existujúci Supabase smer na plnohodnotné leady, nehnuteľnosti, tasky, poznámky a approval queue.
- Notifikácie: Telegram je aktuálny smer; WhatsApp riešiť až ak Telegram nebude Jakubovi sedieť.
- OpenClaw agent pre Jakuba: návrh full broker suite je zdokumentovaný v `docs/JAKUB_OPENCLAW_SUITE_ARCHITECTURE.md`.
- OpenClaw runbook a prvý technický rez:
  - `docs/OPENCLAW_RUNBOOK_2026-06-03.md`,
  - `docs/OPENCLAW_TOOL_CONTRACTS_2026-06-03.md`,
  - `ops/openclaw/README.md`,
  - `ops/openclaw/supabase/SUPABASE_SCHEMA.sql`.
- Conversion funnel research: `docs/CONVERSION_FUNNEL_RESEARCH.md`.
- Príprava na stretnutie s Jakubom: `docs/WEDNESDAY_PREP.md`.
- Aktuálne ponuky: doplniť živé nehnuteľnosti, nielen referenčné predaje.
- SEO: doplniť lokálne landing texty pre Bratislavu a okolie, ak bude cieľ organická návštevnosť.
- SEO/AI polish: Google Search Console, sitemap submit, Twitter cards, Breadcrumb/FAQ/Service structured data a lokálne landing pages.
- Analytics/cookies: ak sa pridá meranie alebo remarketing, doplniť cookie consent.

## Rýchly dev postup

Lokálne spustenie:

```bash
npm install --no-package-lock
npm run dev -- --host 127.0.0.1
```

Build:

```bash
npm run build
```

Pred pushom aspoň:

```bash
npm run build
git status --short
```
