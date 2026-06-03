# Demo path pre Jakuba - 2026-06-03

Ciel: ukazat Jakubovi, ze web uz nie je len vizitka. Je to predajny funnel s vlastnym bookingom, ktory vie zapisovat do Google kalendara.

## 1. Produkcny web

URL: https://jakubolsa.sk/

Ukazat:

- prvy dojem: Jakub osobne + BOSEN Group zázemie,
- hlavu webu s Jakubom a BOSEN logom,
- sekciu servis BOSEN Group,
- aktuálne ponuky a referenčné predaje,
- hlavné CTA na rezerváciu konzultácie.

Povedat Jakubovi:

```text
Toto je teraz zaklad. Vecer potrebujeme prejst texty tak, aby to znelo ako ty, nie ako genericky realitny web.
```

## 2. Martinčekova detail

URL: https://jakubolsa.sk/nehnutelnosti/byt-martincekova/

Ukazat:

- detail aktualnej ponuky,
- fotky,
- parametre,
- CTA na rezervaciu konzultacie namiesto telefonneho cisla,
- footer zhodny so zvyskom webu.

Otazky:

- Aka je presna vymera?
- Ake je poschodie?
- Je cena verejna alebo na vyziadanie?
- Ake su mesacne naklady?
- Je k dispozicii video alebo Instagram reel?
- Pre koho je byt najvhodnejsi?

## 3. Rezervacia

URL: https://staging.jakubolsa.sk/rezervacia/

Ukazat:

- vyber zameru,
- vetvenie otazok podla typu nehnutelnosti,
- Google Places doplnanie adresy,
- vyber datumu a casu,
- obsadene terminy sa nezobrazuju,
- odoslanie test rezervacie.

Demo scenar:

```text
Zamer: Predat byt
Lokalita: Jakubova test adresa alebo vseobecna Bratislava adresa
Izby/vymera/stav: realny priklad
Termin: najblizsi volny staging slot
```

## 4. Calendar event

Po odoslani ukazat v Google Calendar:

- nazov eventu,
- datum a cas,
- klientske udaje,
- zamer,
- lokalitu,
- parametre nehnutelnosti,
- zdroj webu.

Potom test event zmazat.

## 5. Google credentials

Otvorit hlavny meeting checklist:

```text
docs/JAKUB_MEETING_GOOGLE_OPENCLAW_2026-06-03.md
```

Ziskat:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REFRESH_TOKEN
GOOGLE_CALENDAR_ID
```

Po nastaveni staging secrets spravit este jeden realny test.

## 6. Copy walkthrough

Prejst:

- homepage hero,
- BOSEN Group servis,
- proces,
- ponuky/predaje,
- rezervacny wizard texty,
- ochranu osobnych udajov len ako pravny draft.

Hlavna poziadavka na Jakuba:

```text
Povedz mi to vlastnymi slovami. Ja to potom prepisem tak, aby to bolo predajne, ale stale tvoje.
```

## 7. OpenClaw demo

Ukazat koncept:

```text
Jakub posle fotky a kratky popis do Telegramu
-> OpenClaw pripravi draft inzeratu, popis, parametre a navrh CTA
-> Jakub schvali
-> zmena ide najprv na staging
-> az po approval ide na produkciu
```

OpenClaw nie je kriticka cast rezervacie. Booking musi fungovat aj bez neho.
