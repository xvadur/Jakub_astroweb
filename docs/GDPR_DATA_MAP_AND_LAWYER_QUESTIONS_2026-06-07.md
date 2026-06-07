# GDPR data map a otázky pre právnika

Dátum: 7. jún 2026

Účel: pripraviť Jakubovi/BOSEN právnemu zázemiu konkrétny podklad, aby sa neriešilo abstraktné “GDPR”, ale reálny systém: web, booking, Google Calendar, Supabase CRM, Telegram/OpenClaw, email follow-upy, recenzie a analytika.

Toto nie je finálne právne znenie. Je to technický data map + otázky pre právnika.

## Oficiálne zdroje použité pri príprave

- GDPR text: [EUR-Lex Regulation (EU) 2016/679](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A32016R0679)
- EDPB SME guide: [Data controller or data processor](https://www.edpb.europa.eu/sme-data-protection-guide/data-controller-data-processor_en)
- EDPB FAQ: [Controller-processor contract](https://www.edpb.europa.eu/sme-data-protection-guide/faq-frequently-asked-questions/answer/what-should-be-included-controller_en)
- Slovenský úrad: [Úrad na ochranu osobných údajov SR](https://dataprotection.gov.sk/sk/)
- Slovenský úrad cookie stránka ako praktický vzor rozsahu informovania: [Cookies](https://dataprotection.gov.sk/sk/cookies/)
- EDPB Guidelines 07/2020: [Concepts of controller and processor](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-072020-concepts-controller-and-processor-gdpr_en)

## 1. Systémové toky dát

```text
Klient webu
  -> /rezervacia wizard
  -> Cloudflare Worker
  -> Google Calendar event
  -> Supabase CRM contact/lead/appointment/note
  -> Telegram notifikácia Jakubovi
  -> OpenClaw handoff / audit / follow-up
  -> dashboard za Access loginom
```

Budúce toky:

```text
CRM lead
  -> OpenClaw pripraví follow-up alebo review request
  -> Jakub/Adam approval
  -> email klientovi
```

```text
Klient / Jakub pošle fotky nehnuteľnosti
  -> Telegram/OpenClaw
  -> media storage
  -> property draft
  -> staging approval
  -> web publishing
```

## 2. Kategórie údajov

### Rezervačný wizard

Údaje:

- meno,
- telefón,
- email,
- zámer konzultácie,
- lokalita/adresa,
- typ nehnuteľnosti,
- parametre nehnuteľnosti,
- preferovaný dátum a čas hovoru,
- poznámka klienta,
- Google Place metadata pri overenej adrese.

Použitie:

- vybavenie dopytu,
- vytvorenie kalendárovej rezervácie,
- CRM evidencia,
- obchodný follow-up.

### Google Calendar

Údaje:

- meno klienta v názve eventu,
- čas hovoru,
- kontaktné údaje a parametre leadu v popise eventu,
- Google event id.

Použitie:

- plánovanie hovoru,
- dostupnosť termínov,
- kontrola obsadenosti.

### Supabase CRM

Tabuľky:

- `contacts`,
- `leads`,
- `appointments`,
- `notes`,
- `tasks`,
- `properties`,
- `media`,
- `audit_logs`,
- `approval_requests`,
- `admin_cases`.

Použitie:

- obchodná evidencia,
- follow-upy,
- interný dashboard,
- agent audit,
- budúci review workflow.

### Telegram/OpenClaw

Údaje:

- Telegram správy od Jakuba,
- potenciálne hlasovky/fotky,
- interné CRM sumarizácie,
- booking handoff payload,
- agent odpovede a audit.

Použitie:

- pracovný interface pre Jakuba,
- vytváranie leadov,
- sumarizácia,
- follow-upy,
- drafty inzerátov.

### Email follow-up a recenzie

Budúce údaje:

- email klienta,
- meno,
- typ služby,
- stav obchodu,
- dátum odoslania requestu,
- stav `review_requested`.

Použitie:

- potvrdenie rezervácie,
- follow-up po kontakte,
- prosba o Google recenziu po uzavretí spolupráce.

### Analytics/cookies

Aktuálne:

- treba potvrdiť, či web používa iba technicky nevyhnutné cookies alebo aj analytiku.

Budúce:

- traffic analytics,
- conversion tracking,
- campaign attribution.

Ak pôjde o analytiku/marketing tracking, treba vyriešiť cookie lištu, súhlas alebo iný právny režim podľa právneho posúdenia.

## 3. Pravdepodobní aktéri a roly na potvrdenie

Toto musí potvrdiť právnik/BOSEN:

- Jakub alebo BOSEN ako prevádzkovateľ osobných údajov.
- Adam ako sprostredkovateľ alebo technický poskytovateľ/IT operátor.
- Cloudflare ako hosting/Worker/CDN/security spracovateľ.
- Google ako Calendar/Places/email provider.
- Supabase ako databázový provider.
- Telegram ako komunikačný kanál.
- OpenAI/OpenClaw/model provider ako potenciálny spracovateľ pri agent spracovaní textov.
- Email provider pre potvrdenia, follow-upy a recenzie.

EDPB výklad k prevádzkovateľovi/sprostredkovateľovi odporúča mať vzťah medzi prevádzkovateľom a sprostredkovateľom upravený zmluvou a zdokumentovanými pokynmi. Toto je kľúčové pre Adamovu rolu.

## 4. Právne základy na posúdenie

Právnik má potvrdiť právny základ pre každý účel:

- odpoveď na dopyt / rezervácia konzultácie,
- vytvorenie kalendárového eventu,
- CRM evidencia leadu,
- follow-up po konzultácii,
- marketingové/newsletter použitie, ak vôbec,
- Google review request po uzavretí spolupráce,
- analytika a tracking,
- spracovanie cez AI/OpenClaw.

GDPR Article 6 umožňuje viaceré právne základy, vrátane súhlasu, krokov pred zmluvou, plnenia zmluvy, právnej povinnosti a oprávneného záujmu. Konkrétny výber musí sedieť na účel spracúvania.

## 5. Otázky pre právnika/BOSEN

1. Kto má byť prevádzkovateľ: Jakub ako maklér, BOSEN Group, alebo obaja v nejakej konfigurácii?
2. Je Adam sprostredkovateľ osobných údajov? Ak áno, akú zmluvu alebo dodatok potrebuje?
3. Môže Adam prevádzkovať CRM/OpenClaw infra na svojom Mac mini pre Jakubov pilot, ak sú dáta v Supabase a prístup je zabezpečený?
4. Aké informácie musia byť v privacy stránke pre rezervačný wizard?
5. Aký právny základ použiť pre odpoveď na rezerváciu a prvý obchodný kontakt?
6. Aký právny základ použiť pre CRM evidenciu leadov a follow-upy?
7. Ako dlho môžeme držať leady, ktoré sa neuzavreli?
8. Ako dlho držať klientov po uzavretom obchode?
9. Kedy a ako musí klient vedieť požiadať o výmaz alebo opravu údajov?
10. Môže ísť booking payload do Google Calendar event description v takom rozsahu, ako je dnes?
11. Je Telegram vhodný kanál na interné notifikácie s osobnými údajmi klienta?
12. Môžu sa osobné údaje spracúvať cez OpenClaw/OpenAI modely? Ak áno, za akých podmienok a s akým zmluvným krytím?
13. Treba pre AI spracovanie samostatne informovať klienta v privacy stránke?
14. Môže OpenClaw pripravovať follow-up alebo review email, ak odoslanie schvaľuje Jakub?
15. Môže OpenClaw email aj odoslať automaticky pri jasnom pravidle?
16. Ako formulovať súhlas/nesúhlas pre marketingové správy, ak sa budú robiť?
17. Google review request: môže ísť na email klientovi po obchode bez samostatného marketingového súhlasu?
18. Aká cookie/analytics konfigurácia je najjednoduchšia pre V1?
19. Ak použijeme Google Analytics/Meta Pixel, čo presne musí byť v cookie lište?
20. Potrebujeme záznamy o spracovateľských činnostiach pre tento rozsah?
21. Treba DPO alebo nie?
22. Aké zmluvy/DPA treba mať k Cloudflare, Google, Supabase, OpenAI/model providerovi, email providerovi?
23. Ako riešiť sub-sprostredkovateľov, hlavne pri Supabase/Cloudflare/OpenAI?
24. Ako pripraviť incident process, ak sa omylom zverejnia CRM dáta?
25. Kto reálne odpovedá klientovi pri GDPR žiadosti: Jakub, BOSEN, alebo Adam technicky asistuje?

## 6. Bezpečnostné minimum pred reálnymi dátami

Nutné pred ostrým používaním dashboardu:

- Cloudflare Access pre `/dashboard/*`,
- Cloudflare Access pre `/api/dashboard/*`,
- `DASHBOARD_DATA_MODE=crm` až po Access teste,
- vyčistiť smoke test lead/event,
- rotovať Supabase service role key, ktorý bol zdieľaný v chate,
- nepoužívať service role key v browseri,
- audit log pre agent mutácie,
- jasný retention plán.

## 7. Privacy page pracovná štruktúra

Finálna stránka by mala prakticky pokryť:

- kto je prevádzkovateľ,
- kontaktný email,
- aké údaje sa zbierajú,
- účely spracúvania,
- právne základy,
- príjemcovia/spracovatelia,
- prenos mimo EÚ, ak existuje,
- doba uchovávania,
- práva dotknutej osoby,
- cookies/analytics,
- automatizácia/AI spracovanie, ak sa používa,
- ako podať žiadosť alebo sťažnosť.

## 8. Rozhodnutie pre V1

Najbezpečnejší V1 režim:

- dashboard iba za Access loginom,
- Supabase ako CRM pravda,
- OpenClaw mutácie auditované,
- OpenClaw neodosiela klientom správy bez approval,
- review request cez email až po uzavretom obchode a potvrdenom pravidle,
- analytics najprv privacy-friendly alebo vypnuté, kým nie je cookie režim jasný.
