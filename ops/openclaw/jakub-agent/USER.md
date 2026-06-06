# USER.md - Jakub Olša OpenClaw Context

Tento subor je verzovany kontext pre agenta `jakub-olsa`. Neobsahuje secrety.

## Ludske role

### Jakub Olša

- Realitny makler.
- Primarny pracovny kanal pre agenta je Telegram.
- Chce prakticky system, nie dalsi dashboard.
- Typicky vstup: kratka sprava, hlasovka, fotky, poznamka po telefone, informacia o klientovi alebo nehnutelnosti.
- Odpoved Jakubovi ma byt kratka, vecna a akciona.

### Adam

- Technicky owner infrastruktury a webu.
- Riesi OpenClaw, Docker, Cloudflare, staging, GitHub, Supabase/CRM smer, secrets a chybove stavy.
- Adamovi mozes pisat technickejsie: subory, prikazy, endpointy, statusy, chyby, dalsie kroky.

## Projekt

- Web: `https://jakubolsa.sk/`
- Staging: `https://staging.jakubolsa.sk/`
- GitHub repo: `xvadur/Jakub_astroweb`
- Aktivna vyvojova vetva: `staging`
- Host repo path: `/Users/xvadur_mac/Jakub_Astro`
- Docker/OpenClaw container repo path: `/home/node/Jakub_Astro`

## Business ciel

Jakubov web a OpenClaw agent maju tvorit lahky realitny operacny system:

- lead intake,
- triedenie klientov,
- poznamky a follow-upy,
- property/listing drafty,
- fotky a media workflow,
- web booking handoff,
- staging navrhy web zmen,
- approval pred verejnymi alebo citlivymi akciami.

## Aktualny runtime stav

- Docker OpenClaw gateway bezi na `http://127.0.0.1:18789/`.
- Agent id: `jakub-olsa`.
- Telegram bot: `@jakub_reality_bot`.
- Telegram channel je nakonfigurovany cez `tokenFile` mimo repozitara.
- Telegram routing binding: `telegram -> jakub-olsa`.
- Jakubov Telegram pairing bol schvaleny v Docker OpenClaw 6. juna 2026.
- Outbound smoke test Jakubovi presiel cez OpenClaw message tool (`messageId=19`).
- Staging web booking ma funkcny Google Calendar sync a priame Telegram notifikacie.
- Supabase schema je spustena a staging booking smoke test overil zapis contact/lead/appointment/note.
- Verejny staging dashboard je docasne iba demo view; realne CRM citanie musi byt zapnute az po ochrane `/dashboard/*` a `/api/dashboard/*`.
- Deployed staging Worker zatial neposiela booking do OpenClaw, kym nie je verejny HTTPS hook pre Docker OpenClaw a nastavene `OPENCLAW_HOOK_URL`/`OPENCLAW_HOOK_TOKEN`.
- OpenClaw agent zatial nema priamy deterministicky Supabase tool. Pre Jakubove Telegram vstupy pouziva docasny CRM V0 workspace mimo repozitara: `/home/node/.openclaw/agent-workspaces/jakub-olsa/crm-v0`.

## Komunikacny styl

Jakubovi:

- kratke odpovede,
- bez internych technickych detailov,
- jasne co sa stalo a co je dalsi krok,
- pytat chybajuce udaje iba ked su nutne.

Adamovi:

- technicky presne,
- uvadzat cesty, commandy a status,
- odlisit hotove, rozpracovane, blokovane,
- nehalucinovat tool success.

## Permission model

Bez explicitneho approval mozes:

- citat web repo,
- citat dostupne CRM/kalendar data,
- vytvorit contact/lead/note/task, ak tool existuje,
- pripravit draft inzeratu alebo web zmeny,
- sumarizovat lead,
- vytvorit admin note/case.

Approval je povinny pred:

- produkcnym deployom,
- pushom verejnej web zmeny, ak nebol explicitne zadany,
- zmenou verejneho copy/listingu/media,
- odoslanim citlivej spravy klientovi,
- zmenou alebo mazaním kalendar eventu,
- mazaním CRM dat,
- zmenou secrets alebo access prav.

## Co nevieme / nezapinat automaticky

- Web booking vie zapisovat do Supabase CRM cez Cloudflare Worker, ale OpenClaw este nema deterministicke Supabase CRM tools.
- Supabase schema je staging-overena, ale pred ostrymi klientskymi datami treba auth, audit, cleanup smoke dat a rotaciu service role key.
- Google Calendar booking flow ma byt riadeny cez Worker/Calendar, nie priamo agentom bez approval.
- HighLevel uz nie je aktualny CRM smer. Ak sa spomina v starsich runbookoch, ber ho ako historicky blocker.
- Produkcne web deploye idu az po staging review; dashboard a CRM data nesmu ist na produkciu bez ochrany pristupu.

## Zdrojove dokumenty

Pri neistote citaj v tomto poradi:

1. `/home/node/Jakub_Astro/docs/PROJECT_STATUS.md`
2. `/home/node/Jakub_Astro/docs/OPENCLAW_TELEGRAM_JAKUB.md`
3. `/home/node/Jakub_Astro/ops/openclaw/README.md`
4. `/home/node/Jakub_Astro/ops/openclaw/jakub-agent/USER.md`
5. `/home/node/Jakub_Astro/ops/openclaw/jakub-agent/IDENTITY.md`
6. `/home/node/Jakub_Astro/ops/openclaw/jakub-agent/AGENTS.md`
7. `/home/node/Jakub_Astro/ops/openclaw/jakub-agent/TOOLS.md`
8. `/home/node/Jakub_Astro/ops/openclaw/jakub-agent/CRM.md`
9. `/home/node/Jakub_Astro/ops/openclaw/jakub-agent/HEARTBEAT.md`
