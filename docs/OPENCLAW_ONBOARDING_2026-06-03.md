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
- [x] Navrhnut Supabase schema.
- [x] Pridat Worker notifikaciu do Telegramu.
- [ ] Pridat CRM write po uspesnom bookingu.
- [x] Pripravit OpenClaw prompt/personu pre Jakuba.
- [ ] Pripravit workflow "fotky -> property draft".
- [x] Pripravit workflow "lead -> follow-up".
- [x] Pripravit workflow "staging -> approval -> production".

## Pripravene bez secretov - 2026-06-03

- Vytvoreny lokalny OpenClaw agent `jakub-olsa`.
- Agent workspace: `/Users/xvadur_mac/OpenClaw/workspaces/jakub-olsa`.
- Agent je oddeleny od Adamovho `main` agenta.
- Webovy Worker po uspesnom `/api/book` vie spustit non-blocking OpenClaw handoff cez `OPENCLAW_HOOK_URL` + `OPENCLAW_HOOK_TOKEN`.
- Handoff je mimo kritickej booking transakcie a bezi cez `ctx.waitUntil`.
- Docker OpenClaw hooks su zapnute lokalne na `http://127.0.0.1:18889/hooks/agent`.
- Hook token je ulozeny mimo repozitara v `/Users/xvadur_mac/OpenClaw/docker/state/openclaw-config/secrets/jakub-hook-token.txt`.
- Hook default session je `agent:jakub-olsa:main` a povoleny agent je iba `jakub-olsa`.
- Pripravene dokumenty:
  - `docs/OPENCLAW_RUNBOOK_2026-06-03.md`,
  - `docs/OPENCLAW_TOOL_CONTRACTS_2026-06-03.md`,
  - `ops/openclaw/README.md`,
  - `ops/openclaw/jakub-agent/AGENTS.md`,
  - `ops/openclaw/jakub-agent/TOOLS.md`,
  - `ops/openclaw/supabase/SUPABASE_SCHEMA.sql`.

## Ostava ziskat / nastavit

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- public HTTPS hook URL cez Cloudflare Tunnel/Access alebo ekvivalent
- staging Cloudflare secrets pre `jakubastroweb-staging`
- Supabase projekt alebo ekvivalentny CRM backend

## Docker pilot overeny - 2026-06-04

- Docker OpenClaw gateway bezi na host porte `18889`.
- Gateway health/ready endpointy vracaju OK.
- Docker agent `jakub-olsa` existuje s workspace:
  `/Users/xvadur_mac/OpenClaw/docker/state/openclaw-config/agent-workspaces/jakub-olsa`.
- Jakub Astro repo je od 2026-06-05 namountovane do Docker OpenClaw kontajnera:
  - host: `/Users/xvadur_mac/Jakub_Astro`,
  - container: `/home/node/Jakub_Astro`,
  - agent workspace symlink: `/home/node/.openclaw/agent-workspaces/jakub-olsa/Jakub_Astro`.
- Agent model bol opraveny z `openai-codex/gpt-5.5` na `openai/gpt-5.5`, aby pouzival existujuci OpenAI OAuth auth profil.
- Smoke test cez Docker `openclaw-cli agent --agent jakub-olsa` presiel a agent odpovedal `OK`.
- Astro repo connection smoke test cez `jakub-olsa` presiel 2026-06-05:
  - agent precital `/home/node/Jakub_Astro/package.json`,
  - odpovedal `CONNECTED`,
  - package je `clients-jakub-olsa`,
  - `astro.config.mjs` existuje.
- Docker `/hooks/agent` smoke test presiel 2026-06-04:
  - no-auth request vracia `401 Unauthorized`,
  - autorizovany request vratil `ok:true` a `runId`,
  - session `agent:jakub-olsa:main` ulozila odpoved `OK`.
- Lokalny Worker E2E test presiel 2026-06-04:
  - `POST /api/book` na lokalnom Workeri vratil `200 OK` v `mode: mock`,
  - booking bol cez `ctx.waitUntil` odovzdany do Docker OpenClaw `/hooks/agent`,
  - `jakub-olsa` spracoval web booking v session `agent:jakub-olsa:main`,
  - HighLevel CRM connector vratil `401 Reauthentication required`,
  - agent namiesto halucinovaneho CRM zapisu vytvoril interny admin case:
    `/Users/xvadur_mac/OpenClaw/docker/state/openclaw-config/agent-workspaces/jakub-olsa/admin-cases/2026-06-04-web-booking-16edb862.md`.
- Docker OpenClaw zatial nema nakonfigurovany Telegram channel; onboarding sa zastavil na chybajucom `TELEGRAM_BOT_TOKEN`.
