# Stav projektu Jakub Olša web

Posledná aktualizácia: 30. máj 2026

## Aktuálny stav

Web je pripravený ako prezentačný realitný web pre Jakuba Olšu. Primárny účel prvej verzie je:

- ukázať, kto je Jakub a ako pracuje,
- vysvetliť služby pri predaji, kúpe, prenájme a odhade ceny,
- ukázať referenčné predaje,
- dostať návštevníka ku kontaktu alebo rezervácii konzultácie.

V1 je statická Astro stránka. Nepoužíva vlastný backend, databázu ani CRM. Rezervácia konzultácie je zatiaľ samostatný wizard na `/rezervacia/`, ktorý pripraví štruktúrovaný `mailto:` lead; reálne napojenie na kalendár príde až po potvrdení Jakubovho kalendára.

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

## Rozhodnutia

- n8n sa v prvej verzii nepoužíva.
- V prvej verzii sa používa iba jednoduchý emailový formulár cez `mailto:`, aby sme neriešili backend, CRM a deliverability navyše.
- Booking má ísť po ďalšej iterácii cez Google Calendar appointment schedule alebo podobnú kalendárovú vrstvu, aby web nemusel držať obsadenosť alebo riešiť duplicity.
- CRM nie je súčasť V1. Ak bude treba, pridá sa neskôr cez Cloudflare Worker, Google Sheet/Notion, OpenClaw alebo iný backend.
- Telefonický kontakt zostáva na webe, pretože Jakub ho má aj na Instagrame a pre jeho typ práce dáva zmysel.
- Produkcia sa chráni cez staging workflow: experimenty, OpenClaw mutácie, tracking, booking a lead magnet úpravy idú najprv na `https://staging.jakubolsa.sk/`.
- Cloudflare API tokeny a iné tajomstvá sa nesmú ukladať do repozitára.
- Booking funnel zatiaľ nepredstiera reálne voľné sloty v kalendári. Zvolený termín je predbežný, kým Jakub nepotvrdí používaný kalendár a spôsob integrácie.
- Google Maps API kľúč sa nesmie ukladať do repozitára. Musí byť nastavený ako environment variable a obmedzený na povolené domény.

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
npx wrangler deploy --assets=dist --name=jakubastroweb --compatibility-date=2026-05-26
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
npx wrangler deploy --assets=dist --name=jakubastroweb-staging --compatibility-date=2026-05-26
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
- Získať Jakubov reálny Google Calendar appointment schedule link, ak má web používať rezerváciu namiesto emailového fallbacku.
- V Cloudflare nastaviť produkčnú env premennú:

```bash
PUBLIC_BOOKING_URL=<Jakubov realny Google Calendar booking link>
```

- Overiť, že všetky CTA na produkcii buď smerujú na Jakubov reálny booking, alebo zámerne používajú emailový fallback.
- Skontrolovať stránku na mobile po nasadení na reálnej doméne.
- Skontrolovať SSL/TLS v Cloudflare, ideálne `Full`.
- Potvrdiť s Jakubom telefónne číslo, email, Instagram a povolenie použiť fotky/referencie.
- Skontrolovať právny text ochrany osobných údajov s reálnymi údajmi prevádzkovateľa.

## Neskôr

- CRM-lite: ukladať dopyty/rezervácie do Google Sheet, Notion alebo vlastnej databázy.
- Notifikácie: Telegram alebo WhatsApp po odoslaní formulára/rezervácie.
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
