# AI leadgen research 2026 - Jakub Olša

Datum: 24. jun 2026

Ucel: vyhodnotit, kam posunut aktualny web + wizard + CRM + analytiku tak, aby z toho nebola iba stranka, ale maly realitny leadgen system.

## Short answer

Najlepsi dalsi smer je **Signal Engine**, nie chatbot-first.

Mame uz spravnu kostru:

```text
web -> wizard -> booking API -> Google Calendar / CRM / email / notification -> analytics attribution
```

Teraz ju treba zefektivnit takto:

```text
navstevnikove signaly
  -> lead scoring
  -> CRM status
  -> rychly follow-up
  -> campaign feedback loop
  -> optimalizacia landing/wizardu
```

Toto je prakticke aj pre maly tim, lebo vyuziva existujuci kod a nepotrebuje hned drahy enterprise CRM.

## Externe patterny 2026

### 1. Qualified lead je dolezitejsi nez lacny lead

Google aj Meta tlacia smer, kde reklamne systemy nemaju optimalizovat iba na submit formulara, ale na kvalitne downstream udalosti. Google Enhanced Conversions for Leads pouziva first-party udaje z lead formu a nasledny offline/CRM import, aby priradil realny vysledok spat ku kampani. Google od juna 2026 presuva offline/enhanced lead importy smerom na Data Manager API.

Zdroj:

- [Google Ads Help - About enhanced conversions for leads](https://support.google.com/google-ads/answer/15713840)
- [Google Ads Help - About offline conversion imports](https://support.google.com/google-ads/answer/2998031)

Implication pre nas:

- nestaci merat `booking_submit_success`;
- treba neskor vediet poslat spat `qualified_lead`, `appointment_completed`, `seller_opportunity`, pripadne `won_listing`;
- preto musi CRM drzat campaign/attribution data.

### 2. CRM feedback loop je realny moat

Meta ma samostatny Conversions API for CRM smer: CRM posiela kvalitativne lead eventy spat do Meta, aby system vedel hladat viac podobnych leadov. Nejde o magiu; ide o to, ze ad platforma dostava signal, ktory lead bol dobry.

Zdroj:

- [Meta for Developers - Conversions API for CRM Integration](https://developers.facebook.com/documentation/ads-commerce/conversions-api/conversion-leads-integration)
- [Meta Blueprint - Maximize lead quality with Meta Conversions API for CRM](https://www.facebookblueprint.com/student/page/603002-maximize-lead-quality-with-meta-conversions-api-for-crm)

Implication pre nas:

- dnes staci pripravit strukturu eventov a CRM statusov;
- Meta CAPI netreba implementovat pred consent/GDPR rozhodnutim;
- do buducna bude dolezite ukladat `fbclid`, `_fbp`, `_fbc`, user agent a consent state, ak sa pojde do Meta kampani.

### 3. Real estate leadgen 2026 je kombinacia webu, CRM a nurture

Realitne nastroje v roku 2026 sa tocia okolo troch veci: zachytit predajcu, dlhodobo ho nurturovat a mat CRM, ktore nestrati vztah. Seller lead je casto dlhsia hra nez buyer lead.

Zdroj:

- [Ylopo - Seller lead generation tools for real estate agents 2026](https://www.ylopo.com/blog/best-lead-generation-tools-for-targeting-home-sellers)
- [TechRadar - Best CRM for real estate of 2026](https://www.techradar.com/best/the-best-crm-for-real-estate)

Implication pre nas:

- Jakubov funnel nema lovit len okamzitych predajcov;
- ma vediet ulozit aj "zvazujem predaj", "chcem odhad", "riesim dedicstvo/rodinu", "chcem najprv poradit";
- follow-up a statusy budu rovnako dolezite ako samotny web.

### 4. Speed-to-lead stale vyhrava

V real estate sa lead rychlo ochladi. Najlacnejsi upgrade nie je AI avatar na webe, ale okamzita notifikacia a navrhnuty dalsi krok.

Implication pre nas:

- high-score lead musi ist Jakubovi okamzite;
- email potvrdenie klientovi musi prist hned;
- CRM task/follow-up ma vzniknut automaticky;
- OpenClaw moze byt operator, ktory Jakubovi rano povie: "toto su horuce leady a dalsie kroky".

## Top 10 patternov pre Jakub funnel

### 1. Signal Engine

Co to je:

Kazdy vyznamny krok na webe sa stane signalom: CTA click, wizard start, step view, intent select, date select, submit, CRM created, email queued, calendar created.

Co uz mame:

- `window.jakubTrackEvent`
- `booking:funnel` custom event
- UTM/referrer/landing attribution
- `bookingStatus`, `crmStatus`, `emailStatus`

Co chyba:

- jednotny event slovnik;
- internal event log;
- session/lead correlation ID;
- jednoduchy dashboard alebo export.

Priorita: P0.

### 2. Lead Scoring V1

Co to je:

Skore, ktore povie, ci lead vyzera ako realna obchodna prilezitost.

Navrh V1:

```text
+30 predaj bytu/domu/pozemku
+20 komplet kontakt: meno + telefon + email
+15 konkretna lokalita alebo Google place ID
+15 zvoleny termin
+10 casovy horizont do 3 mesiacov
+10 vyplnene parametre nehnutelnosti
-20 chyba telefon
-20 chyba zamer
-15 iba vseobecna sprava bez nehnutelnosti
```

Interpretacia:

```text
80+ hot lead
50-79 qualified lead
25-49 nurture lead
0-24 weak/incomplete lead
```

Co uz mame:

- CRM ma `qualification_score` stlpec.

Co chyba:

- vypocet score vo Workerovi;
- ulozenie score do `leads.qualification_score`;
- score v Telegram/email/CRM note.

Priorita: P0.

### 3. CRM Outcome Loop

Co to je:

Lead po submitnuti nezostane navzdy `new`. Musi prejst stavmi:

```text
new -> contacted -> appointment_completed -> qualified -> opportunity -> won/lost
```

Co uz mame:

- Supabase tabulky `contacts`, `leads`, `appointments`, `notes`, `tasks`;
- OpenClaw vie byt agenticka vrstva.

Co chyba:

- jasne statusy a definicie;
- jednoduchy sposob, ako Jakub/Adam zmeni status;
- export/feedback event pre kampane.

Priorita: P0/P1.

### 4. Campaign Feedback Loop

Co to je:

Google/Meta nemaju dostavat iba "niekto vyplnil wizard". Neskor maju dostavat "tento lead bol kvalifikovany" alebo "z toho bol realny obchodny rozhovor".

Co uz mame:

- UTM capture;
- moznost ulozit raw payload do CRM;
- consent-gated analytics.

Co chyba:

- `gclid`, `gbraid`, `wbraid`, `fbclid`, `_fbp`, `_fbc` capture, ak sa zapnu kampane;
- consent state pri leade;
- Google Enhanced Conversions / Data Manager export plan;
- Meta CAPI plan.

Priorita: P1 pred kampanami, P0 pred skalovanim kampani.

### 5. Speed-to-Lead Notification

Co to je:

Jakub dostane nie len "prisiel lead", ale kontext:

```text
Hot lead: Predaj bytu, Bratislava, termin zajtra 10:00, score 85, zdroj google/cpc.
Dalsi krok: zavolat pred terminom alebo potvrdit konzultaciu.
```

Co uz mame:

- Telegram support vo Workerovi;
- email confirmation;
- CRM note.

Co chyba:

- prioritizovana notifikacia podla score;
- odlisit hot lead vs nurture lead;
- task `follow up do X hodin`.

Priorita: P0.

### 6. AI Follow-Up Pack

Co to je:

Po bookingu system pripravi follow-up texty:

- klientovi: potvrdenie + co si pripravit;
- Jakubovi: call brief;
- po hovore: navrh dalsieho emailu alebo tasku.

Co uz mame:

- Resend confirmation;
- CRM notes;
- OpenClaw agent koncept.

Co chyba:

- sablony podla intentu;
- brief generator nad CRM payloadom;
- po-hovorovy status/update proces.

Priorita: P1.

### 7. Wizard Personalization Without Chatbot

Co to je:

Wizard sa jemne meni podla zameru. Nie velky chatbot. Len lepsie otazky a CTA.

Priklady:

- po `Predaj bytu`: CTA "Rezervovat predajnu konzultaciu";
- po `Odhad ceny`: text "Pozrieme sa na realnu predajnu cenu a postup";
- po `Prenajom/sprava`: menej tlacit predajny audit.

Co uz mame:

- route-specific field meta vo `rezervacia.astro`;
- dynamicke parametre podla typu.

Co chyba:

- mikrocopy a confirmation texty podla intentu;
- meranie drop-offu podla vetvy.

Priorita: P1.

### 8. Retargeting Segments

Co to je:

Nie kazdy visitor je rovnaky. Segmenty:

```text
visited_home
clicked_reservation
started_wizard
selected_seller_intent
abandoned_contact_step
submitted_booking
```

Co uz mame:

- analytics hooky;
- consent gating.

Co chyba:

- GA4/GTM audiences;
- Meta audiences po schvaleni;
- privacy policy final.

Priorita: P1/P2, az po meracom setup-e.

### 9. Instagram Content Loop

Co to je:

Jakubove Instagram videa sa nepouziju iba ako link v menu. Spravi sa z nich proof system:

- video ako social proof na landing page;
- kratke ads creatives;
- FAQ/copy snippets;
- follow-up material po bookingu.

Co uz mame:

- Instagram link;
- Jakub positioning.

Co chyba:

- inventar Jakubovych videi;
- vyber 5 najlepsich proof klipov;
- povolenie a asset workflow.

Priorita: P1 po piatkovom stretnuti.

### 10. AI Concierge / Chatbot

Co to je:

Konverzacna vrstva, ktora vie zachytit cloveka pred formularom.

Verdikt:

Zatial nie ako P0. Pre Jakuba je lepsie mat kratky wizard a rychly follow-up. Chatbot moze posobit lacno alebo zavadzat, ak nema presny obchodny playbook.

Kedy ano:

- ked budeme mat realne FAQ z hovorov;
- ked bude jasne, ake otazky klienti stale opakuju;
- ked budeme mat privacy/GDPR a handoff do CRM vyrieseny.

Priorita: P2.

## Co uz mame pripravene

Technicky:

- Astro web a `/rezervacia/`;
- Cloudflare Worker API;
- Google Calendar availability/booking path;
- Supabase CRM write path;
- Resend confirmation path;
- Telegram notification path;
- attribution capture;
- consent-gated analytics;
- wizard event hooks;
- CRM tabulku `leads.qualification_score`;
- staging oddeleny od produkcie.

Produktovo:

- Jakub ako osobny makler s BOSEN zazemim;
- wizard ako kvalifikacny formular;
- predajny audit / konzultacia ako primarny lead magnet;
- piatkovy demo script.

## Co chyba

Povinne pred realnym lead sprintom:

- live staging booking smoke so skutocnym Calendar/CRM/email/notification;
- GA4/GTM rozhodnutie a meracie ID;
- final consent/GDPR rozhodnutie pre marketingove cookies;
- Cloudflare/Resend email routing potvrdenie;
- Supabase secrets na staging/prod;
- Jakubov realny follow-up proces.

Signal Engine:

- lead score;
- lead status definitions;
- campaign click id capture;
- internal event log alebo minimalny CRM event audit;
- dashboard/report pre kvalitu leadov.

## Najlepsi dalsi sprint

Nazov: **Signal Engine V1**

Ciel:

Z webu a wizardu urobit meratelny kvalifikacny system.

Scope:

1. Pridat `lead_score` vypocet vo Workerovi.
2. Ukladat `qualification_score` do CRM.
3. Rozsirit attribution capture o campaign click IDs:
   - `gclid`
   - `gbraid`
   - `wbraid`
   - `fbclid`
4. Vygenerovat `lead_id/session_id` correlation hodnotu pre submit.
5. Doplnit notifikaciu o:
   - score,
   - intent,
   - source,
   - next action.
6. Definovat CRM statusy a minimalny follow-up workflow.
7. Vytvorit maly report:
   - visits to reservation,
   - wizard starts,
   - submits,
   - score buckets,
   - source by score.

Out of scope pre tento sprint:

- full AI chatbot;
- Meta CAPI production;
- Google Data Manager automation;
- zlozite dashboardy;
- plnohodnotny marketing automation suite.

## Implementacny backlog

### P0 - pred kampanami

- [ ] Implementovat `calculateLeadScore(payload)` vo Workerovi.
- [ ] Ukladat `qualification_score` do Supabase `leads`.
- [ ] Pridat score do Telegram/email/admin note.
- [ ] Rozsirit attribution o `gclid`, `gbraid`, `wbraid`, `fbclid`.
- [ ] Ulozit consent state k booking payloadu.
- [ ] Definovat CRM statusy: `new`, `contacted`, `appointment_booked`, `appointment_completed`, `qualified`, `opportunity`, `won`, `lost`, `nurture`.
- [ ] Spravit staging live smoke s test leadom.

### P1 - po zakladnom smoke

- [ ] Spravit CRM/list report pre leady podla score a zdroja.
- [ ] Doplnit follow-up email sablony podla intentu.
- [ ] Pripravit Jakub call brief z payloadu.
- [ ] Vytvorit UTM naming convention pre Google/Meta/Instagram.
- [ ] Pripravit Google Enhanced Conversions/Data Manager field map.
- [ ] Pripravit Meta CAPI CRM field map bez produkcneho zapnutia.

### P2 - ked budu prve realne leady

- [ ] Porovnat score vs realna kvalita leadu.
- [ ] Upravit wizard podla drop-offov.
- [ ] Pridat retargeting audiences.
- [ ] Vyhodnotit, ci dava zmysel AI concierge.
- [ ] Z Instagram videi vyrobit proof/content loop.

## Co je hype alebo zatial zbytocne

Zatial nerobit:

- AI chatbot na homepage iba preto, ze je rok 2026;
- genericke pop-upy a exit intent modaly bez jasnej ponuky;
- lead magnet PDF bez distribucie;
- komplexny BI dashboard pred prvymi realnymi leadmi;
- automaticke posielanie PII do reklamnych systemov bez consent/GDPR rozhodnutia;
- prediktivne seller data kupovane z drahych platforiem pred dokazom, ze Jakub vie rychlo konvertovat inbound leady.

## Piatkove odporucanie pre Jakuba

Povedat jednoducho:

```text
Uz mame web a rezervacny funnel. Teraz dalsi krok nie je pridat dalsie pekne sekcie, ale naucit system rozoznavat kvalitu leadu.

Ked clovek pride z Google, Instagramu alebo reklamy, ulozime zdroj, zamer, nehnutelnost, termin a kontakt. Z toho system vypocita, ci je to horuci lead alebo len niekto, koho treba nurturovat. Jakub dostane kontext hned, CRM drzi historiu a neskor vieme reklamam povedat, ktore leady boli realne kvalitne.

To znamena, ze nebudeme platit reklamy naslepo za kliky. Budeme postupne optimalizovat na realne obchodne rozhovory.
```

Rozhodnutia od Jakuba:

- ktory lead je pre neho kvalitny;
- ako rychlo vie reagovat;
- ktory kanal chce pre notifikacie;
- ci chce predajcov, kupujucich alebo vsetko;
- ci mame zacat malym Google Search testom po zapnuti merania.

## Prakticky zaver

Toto cele je spravne postavene na to, aby z toho vznikol realny system.

Najvacsia hodnota teraz nie je pridat dalsie funkcionality. Najvacsia hodnota je zavriet loop:

```text
zdroj navstevy -> spravanie vo wizarde -> kvalita leadu -> follow-up -> realny obchodny vysledok -> spatna vazba do kampani
```

Ked toto funguje, web prestane byt vizitka a zacne byt predajny nervovy system.
