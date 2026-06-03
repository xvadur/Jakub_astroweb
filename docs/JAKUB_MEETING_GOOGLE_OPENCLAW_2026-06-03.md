# Jakub meeting sheet - Google booking, OpenClaw, copy, BOSEN

Datum: streda 2026-06-03  
Miesto: u Jakuba, Úzka 28b, Dunajská Lužná  
Ciel dnesneho stretnutia: ukazat Jakubovi rezervacny system, prejst copy webu, spravit Google Calendar autorizaciu na jeho osobny Google ucet a pripravit OpenClaw/Telegram onboarding.

## 0. Dnesny pracovny plan

Poradie:

1. Ukazat produkcny web a rezervacny wizard.
2. Spravit Google Calendar autorizaciu pre Jakubov novy booking kalendar.
3. Nastavit staging secrets a otestovat realny zapis do Jakubovho kalendara.
4. Prejst copy webu s Jakubom sekciu po sekcii.
5. Ukazat OpenClaw demo/koncept a potvrdit Telegram-first workflow.
6. Prebrat GDPR/cookies/analytics s tym, ze pravne finalizovanie pojde cez BOSEN pravne zazemie.

Architektura rezervacie:

```text
wizard -> Cloudflare Worker -> Google Calendar sync -> Telegram/OpenClaw notifikacia -> CRM/Supabase neskor
```

OpenClaw nebude rozhodovat o tom, ci rezervacia vznikne. Najprv musi spolahlivo prebehnut kalendar, az potom OpenClaw spracuje lead, notifikaciu, CRM a follow-up.

## 1. Google veci, ktore dnes realne potrebujeme

### Calendar booking - credentials

Potrebujeme tieto hodnoty:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REFRESH_TOKEN
GOOGLE_CALENDAR_ID
```

Kde sa ziskaju:

| Hodnota | Kde ju ziskat | Poznamka |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID` | Google Cloud Console -> APIs & Services -> Credentials -> OAuth client | Web application client |
| `GOOGLE_CLIENT_SECRET` | rovnake miesto ako Client ID | secret nikdy necommitovat |
| `GOOGLE_REFRESH_TOKEN` | OAuth Playground po autorizacii Jakubovho Google uctu | toto je kluc k dlhodobemu zapisu do kalendara |
| `GOOGLE_CALENDAR_ID` | Google Calendar -> Settings -> novy booking kalendar -> Integrate calendar -> Calendar ID | Jakub bude mat novy samostatny kalendar |

Linky:

```text
Google Cloud Console:
https://console.cloud.google.com/

Credentials:
https://console.cloud.google.com/apis/credentials

OAuth consent:
https://console.cloud.google.com/apis/credentials/consent

Google Calendar API:
https://console.cloud.google.com/apis/library/calendar-json.googleapis.com

OAuth Playground:
https://developers.google.com/oauthplayground

Google Calendar:
https://calendar.google.com/

Google app permissions:
https://myaccount.google.com/connections
```

### API, ktore treba zapnut pre booking

```text
Google Calendar API
```

Google Cloud link:

```text
https://console.cloud.google.com/apis/library/calendar-json.googleapis.com
```

OAuth scopes:

```text
https://www.googleapis.com/auth/calendar.freebusy
https://www.googleapis.com/auth/calendar.events
```

Tieto scopes su potrebne preto, aby Worker vedel:

- citat obsadenost cez `freeBusy`,
- zapisat rezervaciu cez `events.insert`.

## 2. OAuth client pre Jakuba

Jakubov Google bude osobny Google ucet.

Odporucany nazov Google Cloud projektu:

```text
jakubolsa-booking
```

Odporucany nazov OAuth klienta:

```text
jakubolsa-booking-worker
```

Application type:

```text
Web application
```

Authorized redirect URI:

```text
https://developers.google.com/oauthplayground
```

Authorized JavaScript origins:

```text
https://jakubolsa.sk
https://staging.jakubolsa.sk
```

OAuth consent screen:

```text
User type: External
App name: Jakub Olsa Booking
User support email: Jakubov Google email
Developer contact email: Adamov alebo Jakubov email
Publishing status: po teste prepnúť na Production
```

Dolezite: ak OAuth app zostane `External + Testing`, refresh token pre Calendar scopes moze expirovat po 7 dnoch. Po teste ju preto treba dat do `Production`.

## 3. Novy Jakubov booking kalendar

Jakub bude mat novy samostatny kalendar pre webove rezervacie.

Navrh nazvu:

```text
Web rezervacie - Jakub Olsa
```

Postup:

1. Otvorit `https://calendar.google.com/`.
2. Settings.
3. Add calendar.
4. Create new calendar.
5. Nazov: `Web rezervacie - Jakub Olsa`.
6. Po vytvoreni otvorit nastavenia tohto kalendara.
7. Sekcia `Integrate calendar`.
8. Skopirovat `Calendar ID`.

Toto ulozime ako:

```text
GOOGLE_CALENDAR_ID
```

Nepouzivat `primary`. Jakub bude mat oddeleny booking kalendar.

## 4. Refresh token cez OAuth Playground

1. Otvorit:

```text
https://developers.google.com/oauthplayground
```

2. Vpravo hore otvorit nastavenia.
3. Nastavit:

```text
OAuth flow: Server-side
Access type: Offline
Force prompt: Consent Screen
Use your own OAuth credentials: checked
```

4. Vlozit:

```text
OAuth Client ID = GOOGLE_CLIENT_ID
OAuth Client secret = GOOGLE_CLIENT_SECRET
```

5. Scope pole:

```text
https://www.googleapis.com/auth/calendar.freebusy https://www.googleapis.com/auth/calendar.events
```

6. Kliknut `Authorize APIs`.
7. Prihlasit sa ako Jakub.
8. Po navrate kliknut `Exchange authorization code for tokens`.
9. Skopirovat `Refresh token`.

Access token netreba ukladat. Worker si ho bude obnovovat z refresh tokenu.

Ak refresh token nevznikne:

- skontrolovat `Access type: Offline`,
- skontrolovat `Force prompt: Consent Screen`,
- odstranit predchadzajuci grant v `https://myaccount.google.com/connections`,
- zopakovat flow.

## 5. Cloudflare secrets

Najprv staging:

```text
Worker: jakubastroweb-staging
```

```bash
npx wrangler secret put GOOGLE_CLIENT_ID --name jakubastroweb-staging
npx wrangler secret put GOOGLE_CLIENT_SECRET --name jakubastroweb-staging
npx wrangler secret put GOOGLE_REFRESH_TOKEN --name jakubastroweb-staging
npx wrangler secret put GOOGLE_CALENDAR_ID --name jakubastroweb-staging
```

Po uspesnom teste produkcia:

```text
Worker: jakubastroweb
```

```bash
npx wrangler secret put GOOGLE_CLIENT_ID --name jakubastroweb
npx wrangler secret put GOOGLE_CLIENT_SECRET --name jakubastroweb
npx wrangler secret put GOOGLE_REFRESH_TOKEN --name jakubastroweb
npx wrangler secret put GOOGLE_CALENDAR_ID --name jakubastroweb
```

Telegram neskor:

```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN --name jakubastroweb-staging
npx wrangler secret put TELEGRAM_CHAT_ID --name jakubastroweb-staging
npx wrangler secret put TELEGRAM_BOT_TOKEN --name jakubastroweb
npx wrangler secret put TELEGRAM_CHAT_ID --name jakubastroweb
```

## 6. Google Places

Google Places moze zatial ostat pod Adamovym Google Cloud uctom.

Dovod:

- Google Places je browser API key, nie Jakubov OAuth.
- Nie je naviazany na Jakubov kalendar.
- Pri ocakavanom volume do cca 500 navstev/mesiac sme hlboko v malom usage.
- Dolezite je mat API key obmedzeny referrermi a API restrictions.

Presne potrebujeme:

```text
PUBLIC_GOOGLE_MAPS_API_KEY
```

API, ktore musia byt zapnute:

```text
Maps JavaScript API
Places API
```

Key name:

```text
jakubolsa-places-browser-key
```

Application restriction:

```text
Websites / HTTP referrers
```

Allowed referrers:

```text
https://jakubolsa.sk/*
https://www.jakubolsa.sk/*
https://staging.jakubolsa.sk/*
http://127.0.0.1:4321/*
http://localhost:4321/*
```

API restrictions:

```text
Maps JavaScript API
Places API
```

Poznamka k platbam:

- Google Maps Platform vyzaduje billing account a validny API key.
- Nevyzaduje Google Workspace ako taky.
- Ak to zostane pod Adamovym firemnym Google uctom, je to v poriadku.
- Pri nasom malom traffiku necakame realny naklad, ale key musi byt obmedzeny.

## 7. Staging test po Google nastaveni

URL:

```text
https://staging.jakubolsa.sk/rezervacia/
```

Test:

1. Otvorit wizard.
2. Vybrat zajtrajsi datum.
3. Overit, ze sloty su od `09:00` do `18:30`.
4. Dat do Jakubovho booking kalendara test event napr. `10:00-10:30`.
5. Refresh wizardu.
6. Overit, ze `10:00` uz nie je dostupny.
7. Odoslat test booking.
8. Overit, ze event vznikol v kalendari `Web rezervacie - Jakub Olsa`.
9. Zmazat test event.

API smoke:

```text
https://staging.jakubolsa.sk/api/availability?date=2026-06-04
```

Spravny stav po secrets:

```json
{
  "ok": true,
  "mode": "google"
}
```

Ak API vrati `mode: "mock"`, Google secrets nie su nastavene alebo ich Worker nevie pouzit.

## 8. Rezimy a pomenovanie

Technicky nechame:

```text
mode = mock
mode = google
```

Toto je technicky stav integracie.

Ako dalsie pole sa neskor moze doplnit:

```text
calendar_context = admin_test | client_google | production_google
```

Toto je bod na neskor. Dnes riesime Jakubov Google kalendar, copy a OpenClaw demo.

## 9. OpenClaw - potvrdeny V1 smer

Jakub bude mat jedneho samostatneho OpenClaw agenta.

Infra:

```text
Adamov hlavny OpenClaw -> Mac mini
Jakubov OpenClaw -> Adamov Docker sandbox
```

Vstup pre Jakuba:

```text
Telegram ako prvy interface
WhatsApp iba ak Telegram nebude vediet pouzivat
```

Jakub bude mat samostatneho Telegram/OpenClaw bota.

Workflow:

```text
Jakub posle text/fotky/hlasovku do Telegramu
-> OpenClaw pochopi zamer
-> vytvori alebo upravi zaznam v CRM/Supabase
-> pripravi draft podla sablony
-> Jakub skontroluje a odsuhlasi
-> OpenClaw pripravi staging
-> po approval ide staging do main/produkcie
```

Media/fotky:

- Jakub foti nehnutelnosti do telefonu.
- Fotky posiela do Telegramu.
- Fotky sa budu ukladat bud do Supabase storage alebo do Docker/container environmentu ako runtime storage.
- Dlhodobo preferujem Supabase storage, aby fotky neboli viazane na lokalny disk kontajnera.

CRM:

```text
Supabase ako hlavna databaza
Dashboard ako vizualna vrstva nad CRM
OpenClaw ako pracovny interface
```

Approval pravidla:

- Publikovanie na web: vzdy approval.
- Presun staging -> main/produkcia: vzdy approval.
- Mazanie dat: vzdy explicitny suhlas.
- Upravy databazy na zaklade jasneho Jakubovho pokynu: mozu prebehnut bez dalsieho approvalu, ak nejde o mazanie alebo destruktivnu zmenu.
- Upravy kalendara: ak Jakub povie "zmaz tuto udalost", OpenClaw si vypita suhlas a potom ju zmaze.

OpenClaw ma pripravit akciu, ktoru si Jakub vyziada:

- draft inzeratu,
- popis bytu,
- zhrnutie leadu,
- follow-up,
- ulohu,
- upravu CRM,
- staging preview.

## 10. Telegram bot

Bot:

```text
samostatny Telegram bot pre Jakuba
```

Potrebne hodnoty:

```text
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
```

Postup:

1. V Telegrame otvorit `@BotFather`.
2. `/newbot`.
3. Nazov napr. `Jakub Olsa OpenClaw`.
4. Username napr. `jakub_olsa_openclaw_bot`, ak je volny.
5. BotFather da `TELEGRAM_BOT_TOKEN`.
6. Pridat bota do Jakubovej Telegram skupiny/chatu.
7. Ziskat `TELEGRAM_CHAT_ID`.
8. Nastavit secrets na staging a potom produkciu.

## 11. Copy/design session s Jakubom

Dnes treba prejst web ako obchodny pribeh, nie len texty.

Zakladna pravda:

- Adam je Jakubov AI/technologicky partner.
- Jakub je realny makler so skusenostami.
- BOSEN Group je realne servisne a obchodne zazemie.
- Web ma byt autenticky a dokazovy, nie genericka realitna sablona.

Creative direction:

- menej generickych realitnych viet,
- viac realnych proofov,
- viac Jakubovho hlasu,
- viac BOSEN mechanizmu,
- lepsia vizualna praca s fotkami, reels, videom a AI obrazkami,
- inspiracia moze byt moderne sales copy, Hormozi-style clarity, premium broker branding, editorial real-estate presentation.

Prejst sekcie:

- hero,
- BOSEN Group blok,
- sluzby,
- proces,
- ponuky/predaje,
- detail ponuky,
- rezervacny wizard,
- GDPR checkbox,
- footer/kontakt.

Potvrdene smerovanie:

1. Web musi hovorit v prvej osobe ako Jakub.
2. BOSEN povolil pouzitie brandu v plnom rozsahu.
3. BOSEN claims mozeme pouzit odrazne, ak su podlozene verejnymi faktami alebo schvalenim.
4. Konkretne ocenenia a cisla z BOSEN webu mozeme citovat.
5. Cielovka nie je "lacne byty", ale kazdy vlastnik, ktory chce predaj riesit kvalitne. Drahsi klienti su lepsi klienti, ale dobry lead moze byt aj mensia nehnutelnost.
6. Web potrebuje kombinaciu:
   - Jakubove fotky,
   - realne nehnutelnosti,
   - Instagram reels/video,
   - AI obrazky integrovane do vizualnej identity.

## 12. BOSEN Group research brief

Z aktualneho verejneho webu BOSEN vychadza:

- Bosen Real Estate Group posobi na slovenskom trhu od roku 2014.
- Uvadza viac ako 130 realitnych maklerov.
- Posobi na celom Slovensku cez pobocky/franchise.
- Uvadza viac ako 750 nehnutelnosti v ponuke.
- Uvadza viac ako 2300 realizovanych obchodov.
- Uvadza objem obchodov viac ako 678 mil. EUR.
- Uvadza viac ako 450 obchodov rocne.
- Uvadza viac ako 95 % ponuk vo vyhradnom zastupeni.
- Uvadza ocenenia Realitna kancelaria roka 2019, 2020 a 2023 pre region Bratislava.
- Uvadza ocenenie Absolutny vitaz v rokoch 2019 a 2020.
- Realitna unia SR verejne uvadza BOSEN GROUP ako absolutneho vitaza v roku 2023.

Mechanizmy, ktore su pre nas obchodne dolezite:

- BOSEN nie je len logo pri Jakubovom mene.
- Je to servisna, obchodna a reputacna infrastruktura.
- Pre predaj bytu to znamena:
  - databaza kupujucich,
  - siet maklerov,
  - exkluzivne ponuky,
  - marketing,
  - 3D prehliadky,
  - homestaging,
  - pravny/backoffice proces,
  - hypotekarne/financne poradenstvo,
  - know-how z velkeho objemu obchodov.

Silna webova formulacia:

```text
Jakub nie je osamoteny makler s jednym inzeratom. Predaj vedie osobne, ale za nim stoji obchodna, marketingova a servisna infrastruktura BOSEN Group.
```

## 13. Otazky na Jakuba k BOSEN

Potrebujeme zistit, co Jakub realne vie aktivne pouzit.

Otazky:

- Co presne mu BOSEN poskytuje pri predaji bytu?
- Vie aktivne obvolat alebo oslovit BOSEN databazu kupujucich?
- Ako funguje interna siet maklerov?
- Vie dat ponuku najprv interne pred verejnou inzerciou?
- Kto robi fotky, video, 3D, dron, homestaging?
- Vie BOSEN spravit samostatny web nehnutelnosti?
- Ako funguje pravny servis?
- Ako funguje hypotekarne/financne poradenstvo?
- Vie BOSEN pomoct pri najomcovi po predaji investicneho bytu?
- Co je realny rozdiel medzi tym, ked clovek predava sam, a ked predava cez Jakuba + BOSEN?
- Aky konkretny pripad vie Jakub povedat, kde BOSEN infrastruktura realne pomohla predat?
- Moze na webe spomenut "databaza kupujucich"?
- Moze na webe spomenut "interny predaj / interna siet"?
- Moze na webe spomenut konkretne ocenenia BOSEN?
- Moze na webe spomenut cisla z BOSEN webu?

## 14. Listing template - aktualne ponuky

Verejne inzeraty bytov byvaju bohatsie ako nase aktualne detail stranky. Musime sa inspirovat realitnymi portalmi a BOSEN inzerciou.

### Struktura aktualnej ponuky

Hero:

- status,
- nazov,
- lokalita,
- cena,
- hlavna fotka,
- CTA na rezervaciu/obhliadku.

Zakladne parametre:

- typ nehnutelnosti,
- vymera,
- izby,
- poschodie,
- stav,
- balkon/loggia/terasa,
- pivnica,
- parkovanie,
- orientacia,
- energie/mesacne naklady, ak su dostupne,
- dostupnost.

Popis:

- kratky predajny uvod,
- dispozicia,
- technicky stav,
- vybavenie,
- bytovy dom,
- lokalita,
- pre koho je byt vhodny,
- investicny potencial,
- financovanie alebo hypotekarna poznamka,
- BOSEN/Jakub servis.

Media:

- fotogaleria,
- video alebo reels,
- 3D prehliadka,
- podorys,
- mapa/lokalita,
- okolite body zaujmu.

CTA:

- rezervovat konzultaciu/obhliadku,
- email,
- pripadne Instagram.

## 15. Listing template - referencny predaj

Referencny predaj nema byt len archiv. Ma byt proof, ze Jakub vie spravit vysledok.

Struktura:

- co sa predavalo,
- lokalita,
- povodna situacia,
- problem alebo specifikum,
- predajna strategia,
- co spravil Jakub,
- ako pomohol BOSEN,
- vysledok, ak moze byt verejny,
- fotky,
- CTA: "Chcem podobne riesit svoju nehnutelnost".

## 16. SEO a AI vyhladatelnost

Dnes iba pomenovat ako dalsiu fazu. Technicky polishing pride po Google/OpenClaw/copy.

Potrebujeme:

- `robots.txt`,
- `sitemap.xml`,
- canonical URL,
- structured data,
- `/llms.txt`,
- Google Search Console,
- FAQ obsah,
- lokalne SEO sekcie,
- AI crawler politiku.

AI strategy:

- povolit `OAI-SearchBot` pre ChatGPT Search,
- samostatne rozhodnut `GPTBot`,
- obsah robit fakticky a citatelne:
  - kto je Jakub,
  - kde posobi,
  - co riesi,
  - ako pomaha BOSEN,
  - ake ma predaje/ponuky,
  - ako si rezervovat konzultaciu.

## 17. GDPR, cookies, analytics

Dnes pri Jakubovi:

- povedat, ake data zbierame vo wizarde,
- spytat sa, kto cez BOSEN vie skontrolovat GDPR text,
- potvrdit prevadzkovatela,
- potvrdit, ci sa udaje mozu zapisovat do Google Calendar eventu,
- potvrdit, ci bude klientsky email povinny.

Neskorsia faza:

- Cloudflare Web Analytics ako najlahsi prvy krok,
- GA4/GTM/Meta Pixel az s cookie consentom,
- consent mode pre marketing tags,
- neposielat PII do analytics,
- cookie banner az ked realne zapneme cookies/marketing meranie.

## 18. Veci, ktore dnes potrebujeme od Jakuba

- Google email pre booking.
- Potvrdenie noveho booking kalendara.
- Potvrdenie pracovnych hodin:

```text
09:00-19:00
```

- Víkendy:

```text
ano / nie
```

- Sloty:

```text
30 minut, back-to-back ano / nie
```

- Minimalny predstih rezervacie:

```text
0 / 60 / 120 minut
```

- Chce Google Meet link?
- Chce Telegram notifikacie hned?
- Kto dostava notifikacie: Jakub, Adam, obaja?
- Potvrdit telefon, email, Instagram, BOSEN rolu.
- Potvrdit aktivne ponuky.
- Potvrdit referencne predaje.
- Potvrdit, ze BOSEN brand mozeme pouzit v plnom rozsahu.
- Zistit, kto v BOSEN vie skontrolovat GDPR/cookies.
- Prejst copy webu a zapisat Jakubove formulacie.

## 19. Po meetingu

1. Nastavit staging secrets pre Jakubov Google.
2. Otestovat booking do noveho Jakubovho kalendara.
3. Ak staging funguje, nastavit production secrets.
4. Smoke test produkcie.
5. Pripravit Telegram bot.
6. Pripravit OpenClaw Docker/onboarding checklist.
7. Prepisat copy webu podla Jakubovho hlasu.
8. Rozpracovat BOSEN blok podla odpovedi Jakuba.
9. Pripravit SEO/AI technicky zaklad.
10. Pripravit listing template pre Martinčekovu a dalsie ponuky.
