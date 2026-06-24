# Jakub Friday demo - 26. jun 2026

Ucel: pripravit piatkove stretnutie s Jakubom tak, aby bolo jasne, co uz existuje, preco to nie je iba web, ako z toho vzniknu leady a co treba rozhodnut, aby sa do dvoch tyzdnov spustil realny lead sprint.

## Vysledok stretnutia

Na konci stretnutia musia byt rozhodnute tieto veci:

- Jakub chape, ze web je prva vrstva predajneho systemu, nie iba vizitka.
- Jakub potvrdi, kam maju chodit rezervacie a lead notifikacie.
- Jakub potvrdi, ktory kalendar/email sa pouzije pre realny booking.
- Jakub schvali prvy lead sprint: landing page, tracking, kampane, vyhodnotenie.
- Adam ziska minimalny prevadzkovy budget 200 EUR na ChatGPT/AI pracu na dalsich 30 dni.
- Reklamny budget sa riesi oddelene od ChatGPT budgetu.

## Co ukazat

Demo cesta:

```text
jakubolsa.sk
  -> Jakub + BOSEN positioning
  -> referencie / nehnutelnosti
  -> Rezervacia konzultacie
  -> /rezervacia/
  -> typ poziadavky
  -> zakladne informacie o nehnutelnosti
  -> termin hovoru
  -> kontaktne udaje
  -> lead pre Jakuba
```

Hlavna veta pre Jakuba:

```text
Toto nie je len kontaktny formular. Toto je zaciatok kvalifikovaneho lead funnelu: clovek nepride iba s menom a telefonom, ale s kontextom nehnutelnosti, zamerom a navrhnutym terminom hovoru.
```

## Co je aktualne hotove

- Produkcny frontend je zjednoteny na `main` a `staging` je s nim zosynchronizovany.
- Stary staging nie je strateny, je odlozeny v `backup/staging-before-main-sync-2026-06-24`.
- Staging-only napady su spisane v `docs/STAGING_EXTRA_BACKLOG_2026-06-24.md`, aby sa dali cielene vytahovat bez bordelu vo frontende.
- Web komunikuje Jakuba ako osobneho maklera so servisnym zazemim BOSEN.
- Hlavna konverzna cesta vedie do `/rezervacia/`.
- Wizard je zjednoduseny na normalny formularovy jazyk:
  - `Typ poziadavky`,
  - `Zakladne informacie o nehnutelnosti`,
  - `Termin hovoru`,
  - `Kontaktne udaje`.
- Copy vo wizarde uz nehovori o Jakubovi ako o tretej osobe typu "poslite Jakubovi".
- Projekt ma zdokumentovany booking/backend smer cez Cloudflare Worker, Google Calendar a notifikacie.
- Cloudflare Email Routing je pripraveny na domene, ale cielova adresa este musi byt potvrdena.

## Co este nie je hotove

Toto treba povedat rovno, aby piatok nevyzeral ako divadlo:

- Realny Jakubov Google Calendar este nie je plne napojeny na produkcny booking.
- Treba potvrdit cielovy email pre domenu `jakubolsa.sk`.
- Treba rozhodnut, ci notifikacie maju chodit na email, Telegram, WhatsApp alebo CRM-lite.
- Treba zapnut realne meranie konverzii az po rozhodnuti cookies/GDPR rezimu.
- Reklamy este nemaju bezat, kym nie je jasne meranie a landing/conversion path.
- Staging-only leadgen skripty a dashboardy su odlozene na review; netreba ich teraz bulk mergovat.

## Preco to tak funguje

Princip:

```text
navstevnik s predajnym zamerom
  -> kratky webovy proof
  -> rezervacny wizard
  -> kvalifikovany lead
  -> rychla reakcia Jakuba
  -> predajny audit / konzultacia
  -> realna obchodna prilezitost
```

Dovod, preco nerobit iba obycajny kontakt:

- Makler nepotrebuje stovky slabych kontaktov.
- Potrebuje rychlo vediet typ nehnutelnosti, lokalitu, zamer a casovy horizont.
- Wizard filtruje ludi bez toho, aby posobil ako dlhy dotaznik.
- Ak pride lead s kontextom, Jakub vie zavolat konkretnejsie a rychlejsie.

Dovod, preco nerobit hned velky CRM:

- Prva verzia musi dokazat, ze web vie vytvorit realny rozhovor s majitelom nehnutelnosti.
- CRM ma zmysel az ked su realne leady, nie ako dekoracia pred nimi.
- Minimalna prva infrastruktura je booking + notifikacia + meranie konverzie.

## Ako budeme zhanat leady

Prvy ciel nie je "mat reklamu". Prvy ciel je dostat kontrolovatelny pocet kvalitnych predajnych leadov a zistit cenu za realny rozhovor.

### Kanal 1: Google Search

Najvhodnejsi prvy platenny kanal, lebo zachytava ludi s existujucim zamerom.

Priklady tem:

- predaj bytu Bratislava,
- realitny makler Bratislava,
- predat byt bez stresu,
- odhad ceny bytu Bratislava,
- predaj domu Bratislava a okolie,
- predaj pozemku Bratislava.

Landing smer:

```text
Google search ad
  -> predajna landing page
  -> rezervacia konzultacie
  -> lead / hovor
```

### Kanal 2: Meta retargeting a social proof

Toto nedavat ako prvy dokaz vykonu. Meta je dobra na pripomenutie, referencie a osobnu doveru, ale studeny predaj drahej nehnutelnosti sa bude horsie vyhodnocovat nez search.

Pouzitie:

- retargeting ludi, ktori boli na webe,
- kratke proof creatives s Jakubom,
- referencne predaje,
- vysvetlenie predajneho auditu.

### Kanal 3: Manual hunting

Staging backlog obsahuje skripty a koncepty pre manualne hladanie predajnych prilezitosti. Toto sa ma vytiahnut ako samostatna ops vetva, nie miesat do frontendu.

Pouzitie:

- najst vlastnikov/inzeraty, kde dava zmysel maklersky audit,
- pripravit personalizovany outreach,
- zapisat reakcie a follow-upy.

## Co treba do piatku posunut

P0 pred piatkom:

- Overit produkcny web a `/rezervacia/` na mobile.
- Mat pripraveny 5-minutovy demo script.
- Mat jasne pomenovane, co je V1 a co je dalsi sprint.
- Potvrdit, ci su `main` a `staging` stale zladene.
- Zobrat so sebou zoznam rozhodnuti pre Jakuba:
  - cielovy email,
  - Google Calendar ucet,
  - notification kanal,
  - reklamny budget,
  - ChatGPT/AI budget,
  - ci chce leady najprv len na seba alebo aj Adamovi.

P1 ak ostane cas:

- Rebuildnut seller landing page koncept z backlogu do aktualneho `main` stylu.
- Pripravit jednoduchy campaign brief pre Google Search.
- Pripravit UTM naming a meranie konverzie `booking_submit_success`.
- Overit, ci Cloudflare Email Routing destination `olsa@bosen.sk` uz Jakub potvrdil.

## Co pytat od Jakuba

Otazky:

- Ktory email ma byt hlavny pre `rezervacie@jakubolsa.sk`?
- Pouziva realne denne Google Calendar?
- Ma byt rezervacia telefonat, Google Meet alebo iba predbezny termin?
- Aku dlzku hovoru chce: 15, 20 alebo 30 minut?
- Chce kazdy lead hned sebe, alebo najprv filter cez Adama?
- Kolko vie dat ako prvy reklamny test budget mimo ChatGPT budgetu?
- Vie dodat aktualne fotky, referencie a povolenie ich pouzit?
- Chce prioritne predaj bytov v Bratislave, alebo sirsi maklersky funnel?

## Co pytat financne

Oddelit dve veci:

```text
1. Prevadzkovy AI budget pre Adama: minimalne 200 EUR na ChatGPT / pracu s AI.
2. Reklamny budget: separatne peniaze na Google/Meta kampane.
```

Formulacia:

```text
Na tom systeme viem makat rychlo len vtedy, ked mam zaplateny AI stack. Tych 200 EUR nie je odmena za web, ale prevadzkove palivo na dalsi mesiac, aby sme vedeli dokoncit booking, kampane, texty, landing page a vyhodnocovanie.
```

## Dvojtyzdnovy plan po piatku

### Tyzden 1

- Potvrdit email a booking destinacie.
- Napojit realne notifikacie.
- Dokoncit alebo zjednodusit booking backend pre realny lead flow.
- Pripravit seller landing page pre najpravdepodobnejsi segment.
- Rozhodnut meranie: minimalne konverzia rezervacie, telefon, email.
- Pripravit Google Search kampan a keyword set.

### Tyzden 2

- Spustit maly kontrolovany lead test.
- Denne sledovat:
  - navstevy,
  - kliky na CTA,
  - zacate rezervacie,
  - odoslane rezervacie,
  - realne hovory,
  - kvalitu leadov.
- Upravit texty a formulare podla realnych drop-offov.
- Vyhodnotit cenu za realny kvalifikovany hovor.
- Rozhodnut, ci skalovat kampane alebo najprv upravit ponuku/landing page.

## Demo script

Kratka verzia:

```text
Jakub, toto uz nie je iba web.

Je tu produkcny frontend, jasna prezentacia teba ako maklera s BOSEN zazemim a hlavna cesta do rezervacie konzultacie.

Najdolezitejsia cast je wizard. Ten nie je kreativna anketa, ale normalny kvalifikacny formular. Clovek vyberie typ poziadavky, doplni zaklad nehnutelnosti, termin a kontakt. Ciel je, aby si pred prvym telefonatom videl kontext, nie iba meno a cislo.

Staging sme zrovnali s mainom, aby sme nemali bordel vo vetvach. To, co bolo navyse na stagingu, je odlozene v backloge a budeme z toho vytahovat len veci, ktore maju zmysel: seller landing page, leadgen skripty, analytics, dashboard.

Najblizsie potrebujeme rozhodnut email, kalendar a notifikacie. Potom vieme spravit prvy realny lead sprint: Google Search na predajne zamerane dotazy, landing page, rezervacia, meranie a vyhodnotenie kvality leadov.

Ak chceme ist rychlo, potrebujem mat zaplateny AI stack. Minimalne 200 EUR na ChatGPT nie je reklamny budget, ale prevadzkovy budget, aby som vedel tento system denne tahat dalej.
```

## Najvacsie riziko

Najvacsie riziko nie je technika. Najvacsie riziko je, ze sa zacnu riesit reklamy bez jasnej odpovede na:

- kam lead pride,
- kto nan reaguje,
- ako rychlo reaguje,
- co sa povazuje za kvalitny lead,
- ako sa zisti, ktora kampan ho priniesla.

Preto je piatkovy ciel rozhodnut flow, nie predstierat hotovy korporatny CRM.
