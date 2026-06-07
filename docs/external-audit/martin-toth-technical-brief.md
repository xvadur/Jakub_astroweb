# Martin Tóth - technical/product audit brief

## Email reply draft

Ahoj Martin,

jasné, posielam konkrétny kontext podľa tvojich bodov.

Myslím, že máme veľký prienik: ty riešiš chatbotov, weby, objednávkové/rezervačné systémy, SaaS a reálnych klientov. Ja teraz staviam pre konkrétneho realitného makléra kombináciu webu, AI/agent workflow, lead qualification, Google Calendar rezervácie, Telegram notifikácií a Supabase CRM.

Dôležité: nechcem tvrdiť, že je to hotový produkčný SaaS. Je to funkčné MVP blízko soft production pilotu. Vznikalo rýchlo, iteratívne, cez AI/Codex a podľa reálnych potrieb. Funguje, ale určite tam sú ad hoc rozhodnutia, technický dlh a veci, ktoré by skúsený človek možno postavil inak.

Práve preto ti píšem.

## 1. Link / ukážka

Live:

```text
https://jakubolsa.sk/
```

Staging:

```text
https://staging.jakubolsa.sk/
```

Rezervačný wizard:

```text
https://staging.jakubolsa.sk/rezervacia/
```

GitHub:

```text
https://github.com/xvadur/Jakub_astroweb
```

Video:

```text
[SEM DOPLNIŤ LOOM / SCREEN RECORDING]
```

## 2. Čo systém dnes reálne robí

Aktuálne je to Astro + Cloudflare Worker systém pre Jakuba Olšu.

Overený stav:

- produkčný web beží na `jakubolsa.sk`,
- staging beží na `staging.jakubolsa.sk`,
- `/rezervacia/` je vlastný 4-krokový wizard,
- `/api/availability` vie bežať v Google Calendar mode,
- `/api/book` validuje booking payload,
- Worker robí druhý Google free/busy check pred vytvorením eventu,
- po bookingu vie vytvoriť Google Calendar event,
- vie poslať Telegram notifikáciu,
- vie zapísať contact/lead/appointment/note do Supabase CRM,
- dashboard route existuje, ale verejný staging je v demo móde,
- OpenClaw handoff je pripravený v kóde, ale deployed staging ešte nemá verejný bezpečný hook,
- OpenClaw agent `jakub-olsa` lokálne beží cez Docker/Colima a má Telegram binding + repo mount.

Build lokálne prešiel:

```text
npm run build
```

## 3. Čo od teba očakávam

Nechcem všeobecné "vyzerá to dobre".

Chcem production-readiness a product audit od človeka, ktorý už rieši AI/chatbot/rezervačný produkt pre reálnych klientov:

1. Čo je OK na soft production pilot?
2. Čo musí byť fixnuté pred reálnymi leadmi?
3. Čo je technický dlh, ktorý môže počkať?
4. Čo je technický dlh, ktorý by mohol projekt reálne poškodiť?
5. Kde sa systém môže rozbiť?
6. Je toto reálny vertikálny produkt pre maklérov alebo iba web s chatbotom?
7. Aký je najmenší platený MVP scope?
8. Je pricing 5k setup + 1k mesačne realistický?
9. Čo musí systém vedieť, aby som si taký pricing vedel obhájiť?

## 4. Pilotná spolupráca

Predstavoval by som si platený audit v rozsahu 5-10 hodín.

Výstup:

- production-readiness review,
- product/funnel review,
- prioritizovaný zoznam rizík,
- zoznam 5-10 najbližších ticketov,
- pricing sanity check,
- odporúčanie najmenšieho sellable MVP scope.

Kategórie:

```text
P0 - musí byť pred reálnymi dátami/leads
P1 - musí byť pred predajom ďalšiemu maklérovi
P2 - nice to have / škálovanie
Remove - zjednodušiť alebo vyhodiť
```

Ak po videu budeš mať pocit, že to dáva zmysel, dáme krátky call.

Adam

## Video outline pre Martina

### 0:00 - 0:30

Kto som:

> Som Adam, zdravotník, posledný rok buildím cez AI/Codex/GitHub. Toto je funkčné MVP pre konkrétneho realitného makléra, nie iba nápad.

### 0:30 - 1:20

Ukáž homepage:

- Jakub positioning,
- BOSEN zázemie,
- CTA na rezerváciu,
- referenčné predaje.

### 1:20 - 2:40

Ukáž rezerváciu:

- intent,
- typ nehnuteľnosti,
- lokalita,
- Google slots,
- kontakt/GDPR,
- fallback.

### 2:40 - 3:40

Ukáž Worker API:

- `/api/availability`,
- `/api/book`,
- Google Calendar,
- Supabase,
- Telegram,
- OpenClaw handoff.

### 3:40 - 4:30

Ukáž dashboard:

- demo lead list,
- drawer,
- vysvetliť, že reálne CRM čítanie ostáva vypnuté bez auth.

### 4:30 - 5:30

Ukáž GitHub/Codex workflow:

- staging branch,
- dirty working tree,
- docs,
- tickets/backlog,
- ako rozkladáš prácu.

### 5:30 - 6:30

Presná otázka:

> Chcem vedieť, čo musí byť pravda, aby toto bolo produkčne bezpečné a predajné ako systém za 5k setup + 1k mesačne.

