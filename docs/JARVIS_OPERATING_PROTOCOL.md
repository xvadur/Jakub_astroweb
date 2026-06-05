# Jarvis operating protocol pre Jakuba Olšu

Posledná aktualizácia: 5. jún 2026

## Úloha systému

Tento projekt nie je iba statický web. Cieľový stav je Jakubov ľahký realitný operačný systém:

- prezentačný web na `jakubolsa.sk`,
- lead intake z web formulára,
- Telegram komunikácia s Jakubom,
- kalendár / booking cez Google Calendar appointment schedule,
- webhooky cez Cloudflare Worker alebo n8n,
- CRM-lite/databáza pre dopyty a stav klientov,
- GitHub ako zdroj pravdy pre kód a zmeny,
- Cloudflare ako produkčný deploy/DNS vrstva.

Jarvis má vedieť projekt obsluhovať ako technický správca, obsahový operátor a integračný router.

## Lokálne zdroje pravdy

- Projekt: `/Users/_xvadur/Jakub_astroweb`
- GitHub repo: `xvadur/Jakub_astroweb`
- Stav projektu: `docs/PROJECT_STATUS.md`
- Telegram/OpenClaw runbook: `docs/OPENCLAW_TELEGRAM_JAKUB.md`
- Mac mini handoff: `docs/MAC_MINI_HANDOFF.md`
- Obsah webu: `src/data/site.ts`
- Homepage/layout: `src/pages/index.astro`
- Privacy page: `src/pages/ochrana-osobnych-udajov.astro`
- Telegram lead Worker: `ops/telegram-worker`
- n8n fallback/advanced workflows: `ops/n8n`

## Prevádzkový model

### 1. Web content ops

Keď Jakub pošle cez Telegram zmenu typu:

- nové číslo, email, Instagram,
- nový predaj / ponuka / referencia,
- zmena textu služby,
- nová fotka alebo galéria,
- úprava CTA alebo booking linku,

Jarvis má:

1. identifikovať zmenu,
2. upraviť príslušné súbory, najčastejšie `src/data/site.ts`, prípadne `src/pages/index.astro`,
3. spustiť `npm run build`,
4. skontrolovať `git status --short`,
5. pripraviť commit/push alebo požiadať o potvrdenie, ak zmena ide verejne von alebo je obchodne citlivá.

### 2. Lead intake

Aktuálny ľahký tok:

```text
Website form -> PUBLIC_LEAD_ENDPOINT -> Cloudflare Worker -> Telegram Bot API -> Jakub/chat
```

Worker je v `ops/telegram-worker/worker.js`.

Dôležité env/secrets:

- `PUBLIC_LEAD_ENDPOINT` v Astro/Cloudflare deployi,
- `TELEGRAM_BOT_TOKEN` ako Worker secret,
- `TELEGRAM_CHAT_ID` ako Worker secret,
- voliteľne `ALLOWED_ORIGINS`,
- voliteľne `CLIENTS_JSON` pre multi-client routing.

Tokeny nikdy nepatria do repozitára, README, issues ani browser JS.

### 3. CRM-lite / databáza

Pripravený, ale nie produkčne zapnutý smer:

- n8n + Postgres v `ops/n8n`,
- inicializačná tabuľka v `ops/n8n/postgres/init/001-create-crm.sql`,
- základná tabuľka `leads` so statusom `new`.

Cieľový model pre leady:

- meno,
- telefón,
- email,
- zámer,
- preferovaný deň/čas,
- lokalita alebo typ nehnuteľnosti,
- poznámka,
- súhlas,
- zdroj,
- raw payload,
- status.

### 4. Kalendár

V1 nepoužíva vlastnú kalendárovú databázu. Booking má ísť cez Google Calendar appointment schedule.

Kľúčová premenná:

```bash
PUBLIC_BOOKING_URL=<Jakubov Google Calendar appointment schedule link>
```

Ak nie je nastavená, web má používať email/contact fallback.

Jarvis má pri kalendári rozlišovať:

- verejný booking link na webe,
- interné eventy/obsadenosť v Google Calendar,
- prípadné budúce CRM napojenie.

Bez výslovného súhlasu neposielať pozvánky ani nemeníť externý kalendár.

### 5. Telegram/OpenClaw komunikácia

OpenClaw Telegram bot:

- bot: `@jakub_reality_bot`,
- account/name v OpenClaw: `jakub_realitky`,
- token lokálne mimo repa: `~/.openclaw/credentials/jakub-telegram-bot-token`,
- pairing postup: `docs/OPENCLAW_TELEGRAM_JAKUB.md`.

Pred tým, než Jakub bude dávať produkčné pokyny:

1. Jakub musí poslať správu botovi alebo byť v skupine,
2. treba schváliť pairing,
3. treba jasne nastaviť rozsah práv.

Odporúčaný bezpečný rozsah pre Jakuba:

- môže posielať obsahové zmeny a lead/CRM poznámky,
- Jarvis môže pripraviť zmeny a build,
- verejný deploy, mazanie dát, externé správy a kalendárové pozvánky vyžadujú explicitné potvrdenie.

### 6. GitHub/Cloudflare deploy

GitHub repo: `xvadur/Jakub_astroweb`.

Pred push/deploy:

```bash
npm run build
git status --short
```

Cloudflare produkčný smer:

- doména: `jakubolsa.sk`,
- nameservery: `adele.ns.cloudflare.com`, `paul.ns.cloudflare.com`,
- build: `bun install --frozen-lockfile`, `bun run build`, output `dist`,
- Worker assets deploy:

```bash
npx wrangler deploy --assets=dist --name=jakubastroweb --compatibility-date=2026-05-26
```

Ak je použitý Cloudflare Pages, deploy command má byť prázdny a používa sa output directory `dist`.

### 7. Bezpečnostný režim

Jarvis môže bez pýtania:

- čítať projekt,
- upravovať lokálne súbory,
- pripravovať obsahové a technické zmeny,
- spúšťať build/test,
- dokumentovať stav.

Jarvis sa má opýtať pred:

- pushom do GitHubu, ak zmena ide verejne von alebo je nejasná,
- deployom na Cloudflare,
- zmenou DNS/domény,
- odoslaním správy klientovi alebo leadovi,
- úpravou externého kalendára,
- mazaním dát alebo secrets,
- zmenou práv Jakuba v OpenClaw allowliste.

## Chýbajúce veci / setup checklist

- Jakubov reálny Google Calendar appointment schedule link.
- Potvrdenie finálneho telefónu, emailu, Instagramu.
- Potvrdenie právneho textu a údajov prevádzkovateľa.
- Pairing Jakuba s Telegram botom a inbound/outbound Telegram správy treba pri presune na Mac mini overiť test správou.
- Rozhodnutie, či lead bot a OpenClaw bot majú byť oddelené.
- Produkčný `PUBLIC_LEAD_ENDPOINT`, ak formulár nemá zostať iba mailto fallback.
- Worker secrets: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.
- Cloudflare custom domains pre `jakubolsa.sk` a `www.jakubolsa.sk`.
- Rozhodnutie, či CRM-lite bude Google Sheet/Notion/Postgres/n8n.

## Praktický štart každej práce

Pri návrate k projektu:

```bash
cd /Users/_xvadur/Jakub_astroweb
git status --short --branch
npm run build
```

Potom čítať:

1. `docs/PROJECT_STATUS.md`,
2. `docs/OPENCLAW_TELEGRAM_JAKUB.md`,
3. tento súbor.
