# OpenClaw onboarding pre Jakuba - 2026-06-03

Ciel: pripravit Jakubovi samostatneho OpenClaw agenta, ktory bude robit prakticku maklersku pracu cez Telegram, nie iba chatbot demo.

## Rozhodnuty default

- Jakub bude mat jedneho samostatneho OpenClaw agenta.
- Prvy kanal bude Telegram.
- WhatsApp riesime az ak Telegram nebude pre Jakuba pouzitelny.
- Agent pobezi v Docker sandboxe u Adama.
- Adam bude mat svoj hlavny OpenClaw na Mac mini oddelene.
- Booking transakcia nejde cez OpenClaw. Najprv Cloudflare Worker zapise Calendar event, potom OpenClaw spracuje lead.
- CRM bude Supabase alebo ekvivalentna strukturovana databaza.
- Fotky nebudu dlhodobo ulozene ako hlavny storage v Docker kontajneri.
- Primarny storage pre media bude Supabase Storage alebo ekvivalent.
- Public web zmeny pojdu cez staging approval.

## Telegram-first workflow

```text
Jakub posle do Telegramu fotky + kratku instrukciu
-> OpenClaw vytiahne kontext
-> zaradi fotky k nehnutelnosti/leadu
-> pripravi draft inzeratu, parametre, popis, CTA alebo follow-up
-> Jakub skontroluje
-> OpenClaw pripravi zmenu na staging
-> po approval ide publikacia na produkciu
```

## Prvy Telegram bot

Potrebujeme:

```text
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
```

Vecer s Jakubom:

- rozhodnut nazov bota,
- vytvorit bota cez BotFather alebo pripravit proces na zajtra,
- overit, ci Jakub Telegram realne pouziva,
- poslat test spravu,
- zistit chat id,
- nastavit secrets najprv na staging.

## Supabase/CRM smer

Zakladne entity:

```text
contacts
leads
properties
deals
appointments
notes
tasks
media
audit_log
```

Kazda rezervacia musi vytvorit zaznam mimo Google Calendar:

- kontakt,
- lead,
- appointment,
- povodny booking payload,
- zdroj/UTM,
- calendar event id,
- stav spracovania.

Google Calendar je scheduling truth. CRM je business memory.

## Approval pravidla

Approval treba, ked OpenClaw robi:

- publikaciu na produkcny web,
- zmenu verejneho copy,
- zmenu inzeratu,
- zmenu fotiek/media,
- mazanie calendar eventu,
- mazanie CRM dat,
- odoslanie citlivej spravy klientovi.

Approval netreba pri:

- citani kalendara,
- citani CRM,
- vytvoreni poznamky,
- vytvoreni tasku,
- priprave draftu,
- sumarizacii leadu.

## Co chceme ukazat Jakubovi

```text
Toto nebude dalsi nastroj, do ktoreho musis chodit.
Ty posles fotky alebo poziadavku do Telegramu.
Agent si to zaradi, pripravi draft, opyta sa na chybajuce veci a ukaze ti navrh.
Verejne veci pojdu von az po tvojom schvaleni.
```

## Po meetingu

- [ ] Vytvorit Telegram bota.
- [ ] Navrhnut Supabase schema.
- [ ] Pridat Worker notifikaciu do Telegramu.
- [ ] Pridat CRM write po uspesnom bookingu.
- [ ] Pripravit OpenClaw prompt/personu pre Jakuba.
- [ ] Pripravit workflow "fotky -> property draft".
- [ ] Pripravit workflow "lead -> follow-up".
- [ ] Pripravit workflow "staging -> approval -> production".
