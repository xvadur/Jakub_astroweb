# Stav projektu Jakub Olša web

Posledná aktualizácia: 26. jún 2026

## Aktuálny stav

Web je pripravený ako prezentačný realitný web pre Jakuba Olšu. Primárny účel prvej verzie je:

- ukázať, kto je Jakub a ako pracuje,
- vysvetliť služby pri predaji, kúpe, prenájme a odhade ceny,
- ukázať referenčné predaje,
- dostať návštevníka ku kontaktu alebo rezervácii konzultácie.

Web je Astro stránka nasadená cez Cloudflare Workers Static Assets. Rezervácia konzultácie je samostatný wizard na `/rezervacia/` s Cloudflare Worker API backendom. Produkčný Worker zapisuje prijaté rezervácie do Supabase CRM, posiela Telegram notifikáciu cez Jakubov bot a zapisuje potvrdené termíny do Jakubovho Google Calendaru. Google Calendar secrets sú nastavené na stagingu aj produkcii pre Jakubov Google účet `jakubolsa90@gmail.com` a kalendár `Konzultácie`; `/api/availability` na oboch doménach vracia `mode: "google"`. Potvrdzovací email cez Resend je v kóde pripravený, ale produkčne vypnutý, kým nebude overená doména a platný Resend API key.

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
- Worker má zapnutý Google Calendar sync na stagingu aj produkcii cez Cloudflare secrets.
- Produkčný Worker má zapnutý server-side Supabase CRM zápis pre `/api/book`; smoke test vytvoril `contact`, `lead`, `appointment` a `note`.
- Produkčný Worker má zapnutú Telegram notifikáciu cez Jakubov Telegram bot; bot aj cieľový private chat boli overené cez Telegram API.
- Produkčný Worker má zapnutý Google Calendar sync pre Jakubov účet. Smoke test 26. júna 2026 vrátil `mode: "google"` a `bookingStatus: "calendar_created"`.
- Produkčný Worker má Resend email potvrdenia zatiaľ vypnuté, pretože dodaný token nebol platný Resend API key.

## Rozhodnutia

- n8n sa v prvej verzii nepoužíva.
- Rezervačný wizard má ísť cez vlastný Cloudflare Worker backend, nie cez externý Calendly/Appointment Schedule ako primárny funnel.
- Google Calendar bude zdroj pravdy pre dostupnosť. Worker musí pri bookingu urobiť druhý free/busy check, aby sa minimalizoval double-booking.
- CRM je súčasť V1 ako neblokujúci server-side zápis z `/api/book` do Supabase tabuliek `contacts`, `leads`, `appointments` a `notes`. OpenClaw zostáva operačná/agentická vrstva nad CRM, nie kritická cesta bookingu.
- Telefonický kontakt zostáva na webe, pretože Jakub ho má aj na Instagrame a pre jeho typ práce dáva zmysel.
- Produkcia sa chráni cez staging workflow: experimenty, OpenClaw mutácie, tracking, booking a lead magnet úpravy idú najprv na `https://staging.jakubolsa.sk/`.
- Cloudflare API tokeny a iné tajomstvá sa nesmú ukladať do repozitára.
- Booking funnel používa Jakubov Google Calendar `Konzultácie` ako zdroj pravdy pre dostupnosť na stagingu aj produkcii. Worker pri bookingu robí druhý free/busy check a až potom vytvorí event.
- Google Maps API kľúč sa nesmie ukladať do repozitára. Musí byť nastavený ako environment variable a obmedzený na povolené domény.
- Google Calendar OAuth secrets a Telegram secrets sa nesmú ukladať do repozitára. Musia ísť do Cloudflare secrets.
- Supabase service role key a Resend API key sa nesmú ukladať do repozitára. Musia ísť do Cloudflare secrets.

## OpenClaw a Telegram stav

Overené 5. júna 2026:

- OpenClaw gateway beží lokálne cez launchd na porte `18789`.
- Telegram bot v OpenClaw konfigurácii je `@jakub_reality_bot` s menom `jakub_realitky`.
- Telegram token je uložený lokálne v `~/.openclaw/credentials/jakub-telegram-bot-token`, nie v repozitári.
- Telegram channel bol nakonfigurovaný a beží v polling móde. Pred produkčným odovzdaním ho treba znova overiť správou v Telegrame.
- Telegram/OpenClaw pairing treba pri presune na Mac mini overiť test správou, vrátane inbound aj outbound smeru.
- OpenClaw model provider smoke test prešiel cez `openai-codex/gpt-5.5`. Ak auth pri deme zlyhá, obnoviť ho cez `openclaw models auth login --provider openai-codex`.
- Overené 26. júna 2026: produkčný web booking používa Jakubov Telegram bot token z OpenClaw Docker secretu a posiela notifikáciu priamo z Cloudflare Workeru. Toto je produkčná notifikácia, nie agentické spracovanie leadu cez OpenClaw.

Praktický runbook je v `docs/OPENCLAW_TELEGRAM_JAKUB.md`.

## Cloudflare/Wrangler stav

Overené 5. júna 2026:

- Wrangler login na MacBooku je hotový cez OAuth.
- Cloudflare účet: `yksvadur.ja@gmail.com`.
- Cloudflare account ID: `002b0727daee60448cf72c0b08f7810f`.
- OpenClaw môže používať `npx wrangler ...` cez lokálny macOS user profil, ale samostatný Cloudflare API token nie je uložený v OpenClaw secrets.
- Pri presune na Mac mini je najčistejšie spustiť nový `npx wrangler@latest login` na Mac mini namiesto kopírovania OAuth tokenov.

Mac mini prenos je dokumentovaný v `docs/MAC_MINI_HANDOFF.md`.

## Google Calendar OAuth stav

Overené 26. júna 2026:

- Google OAuth Desktop client credentials sú lokálne uložené mimo repozitára v `.secrets/`.
- `gog` pozná OAuth client pod názvom `jakub-calendar`.
- Cieľový Google účet pre Calendar je `jakubolsa90@gmail.com`.
- Jakubov OAuth consent je dokončený a refresh token je uložený mimo repozitára.
- Transfer balík z 26. júna 2026 obsahuje lokálne importné súbory pre `gog`.
- Booking calendar je samostatný Google Calendar `Konzultácie`.
- Cloudflare Worker secrets `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` a `GOOGLE_CALENDAR_ID` sú nastavené pre `jakubastroweb-staging` aj `jakubastroweb`.
- Read-only smoke overil, že `https://staging.jakubolsa.sk/api/availability` aj `https://jakubolsa.sk/api/availability` vracajú `mode: "google"`.
- Live smoke potvrdil, že úspešný `/api/book` vytvorí Google Calendar event a následná dostupnosť označí slot ako `busy`.
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

Doménový email:

- Cloudflare Email Routing je zapnutý pre `jakubolsa.sk`.
- MX záznamy sú prepnuté z Websupportu na Cloudflare:
  - `route2.mx.cloudflare.net` s prioritou `14`,
  - `route3.mx.cloudflare.net` s prioritou `46`,
  - `route1.mx.cloudflare.net` s prioritou `86`.
- Starý Websupport SPF TXT záznam bol odstránený.
- Aktívny SPF TXT je `v=spf1 include:_spf.mx.cloudflare.net ~all`.
- Destination address `olsa@bosen.sk` je v Cloudflare overená.
- Forwarding alias `rezervacie@jakubolsa.sk -> olsa@bosen.sk` je vytvorený a zapnutý.
- Forwarding aliasy `kontakt@jakubolsa.sk` a `info@jakubolsa.sk` ešte nie sú vytvorené.
- Ak Jakub používa inú cieľovú emailovú adresu, vytvoriť novú destination adresu a počkať na jej potvrdenie pred vytvorením forwarding pravidiel.

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
- Vytvoriť ďalšie forwarding aliasy, ak ich Jakub chce používať:
  - `kontakt@jakubolsa.sk`,
  - `info@jakubolsa.sk`.
- V `Workers & Pages` pripojiť custom domains:
  - `jakubolsa.sk`
  - `www.jakubolsa.sk`
- Produkčný Worker už má nastavené Supabase a Telegram secrets:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_TENANT_SLUG
SUPABASE_TENANT_NAME
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
```

- Google Calendar secrets sú nastavené na produkcii aj stagingu.

- Pre potvrdzovacie emaily cez Resend ešte nastaviť:

```bash
RESEND_API_KEY
RESEND_FROM_EMAIL
BOOKING_REPLY_TO_EMAIL
```

- Na inom Macu importovať lokálny `gog` prístup podľa transfer balíka len vtedy, ak má daný stroj priamo pracovať s Jakubovým kalendárom.
- Live smoke už overil, že produkčný `/api/book` vráti `bookingStatus: "calendar_created"` a vytvorí event v Google kalendári `Konzultácie`.
- Overiť, že klient dostane potvrdzovací email až po platnom Resend setup-e.
- Skontrolovať stránku na mobile po nasadení na reálnej doméne.
- Skontrolovať SSL/TLS v Cloudflare, ideálne `Full`.
- Potvrdiť s Jakubom telefónne číslo, email, Instagram a povolenie použiť fotky/referencie.
- Skontrolovať právny text ochrany osobných údajov s reálnymi údajmi prevádzkovateľa.

## Neskôr

- OpenClaw/CRM operácia: follow-upy, scoring, úlohy, správa nehnuteľností a dashboard nad existujúcimi CRM dátami.
- Notifikácie navyše: WhatsApp alebo ďalší interný kanál po odoslaní formulára/rezervácie.
- OpenClaw agent pre Jakuba: návrh full broker suite je zdokumentovaný v `docs/JAKUB_OPENCLAW_SUITE_ARCHITECTURE.md`.
- Conversion funnel research: `docs/CONVERSION_FUNNEL_RESEARCH.md`.
- Príprava na stretnutie s Jakubom: `docs/WEDNESDAY_PREP.md`.
- Aktuálne ponuky: doplniť živé nehnuteľnosti, nielen referenčné predaje.
- SEO: doplniť lokálne landing texty pre Bratislavu a okolie, ak bude cieľ organická návštevnosť.
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
