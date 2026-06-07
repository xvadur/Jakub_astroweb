# Thread handoff - Jakub system

Datum: 2026-06-07 22:31 CEST  
Branch: `staging`  
Repo: `/Users/xvadur_mac/Jakub_Astro`  
GitHub: `xvadur/Jakub_astroweb`

Tento dokument je rychly vstup do novej Codex konverzacie po dlhej pracovnej session.

## Ako zacat novu konverzaciu

Pouzi tento prompt:

```text
Pokračujeme na Jakub projekte. Najprv si precitaj:

/Users/xvadur_mac/Jakub_Astro/AGENTS.md
/Users/xvadur_mac/Jakub_Astro/docs/THREAD_HANDOFF_2026-06-07.md
/Users/xvadur_mac/Jakub_Astro/docs/PROJECT_STATUS.md
/Users/xvadur_mac/Jakub_Astro/ops/openclaw/README.md

Potom skontroluj git status, OpenClaw Docker health, Telegram status a povedz mi najblizsi rozumny krok.
```

## Aktuálny stav v jednej vete

Jakubov projekt ma funkcny Astro web, rezervacny wizard, Cloudflare Worker booking backend, Google Calendar sync na stagingu, Supabase CRM zaklad, Telegram/OpenClaw Docker runtime, Cloudflare Tunnel hook a pripraveny maklersky agent workflow pre leady, booking handoff a listing drafty.

## Stabilne URL

- Produkcia: `https://jakubolsa.sk/`
- Staging: `https://staging.jakubolsa.sk/`
- Rezervacia staging: `https://staging.jakubolsa.sk/rezervacia/`
- OpenClaw local UI/gateway: `http://127.0.0.1:18789/`
- OpenClaw tunnel: `https://openclaw.jakubolsa.sk/`
- OpenClaw health: `https://openclaw.jakubolsa.sk/healthz`

## Aktualne git body

Posledne dolezite commity na `staging`:

- `dcbf884 feat(openclaw): add persistent tunnel hook`
- `3b5c326 feat(openclaw): add listing workflow tooling`

Stav pred uzatvorenim tejto konverzacie:

- `git status` bol cisty,
- `staging` bol pushnuty na `origin/staging`,
- `npm run build` presiel po poslednych zmenach.

## OpenClaw runtime

Docker gateway:

```bash
curl -fsS http://127.0.0.1:18789/healthz
curl -fsS https://openclaw.jakubolsa.sk/healthz
```

Compose status:

```bash
docker compose \
  -f /Users/xvadur_mac/OpenClaw/docker/openclaw-source/docker-compose.yml \
  -f /Users/xvadur_mac/Jakub_Astro/ops/openclaw/docker-compose.jakub.override.yml \
  ps
```

OpenClaw agent:

- agent id: `jakub-olsa`
- Docker repo mount: `/home/node/Jakub_Astro`
- runtime workspace: `/home/node/.openclaw/agent-workspaces/jakub-olsa`
- host runtime workspace: `/Users/xvadur_mac/OpenClaw/docker/state/openclaw-config/agent-workspaces/jakub-olsa`

Core docs source-of-truth:

```text
/Users/xvadur_mac/Jakub_Astro/ops/openclaw/jakub-agent/USER.md
/Users/xvadur_mac/Jakub_Astro/ops/openclaw/jakub-agent/IDENTITY.md
/Users/xvadur_mac/Jakub_Astro/ops/openclaw/jakub-agent/AGENTS.md
/Users/xvadur_mac/Jakub_Astro/ops/openclaw/jakub-agent/TOOLS.md
/Users/xvadur_mac/Jakub_Astro/ops/openclaw/jakub-agent/WORKFLOWS.md
/Users/xvadur_mac/Jakub_Astro/ops/openclaw/jakub-agent/LISTINGS.md
/Users/xvadur_mac/Jakub_Astro/ops/openclaw/jakub-agent/CRM.md
/Users/xvadur_mac/Jakub_Astro/ops/openclaw/jakub-agent/HEARTBEAT.md
```

Sync do runtime:

```bash
/Users/xvadur_mac/Jakub_Astro/ops/openclaw/sync-jakub-agent-runtime-docs.sh
```

## Telegram stav

Overene 2026-06-07:

- bot `@jakub_reality_bot` je platny,
- webhook je prazdny,
- channel status je `configured: true`, `running: true`, `connected: true`, `mode: "polling"`,
- routing binding `telegram -> jakub-olsa` existuje,
- pairing queue bola prazdna,
- posledny realny test, ktory este treba spravit: inbound Telegram `ping`.

Test prikazy:

```bash
docker compose \
  -f /Users/xvadur_mac/OpenClaw/docker/openclaw-source/docker-compose.yml \
  -f /Users/xvadur_mac/Jakub_Astro/ops/openclaw/docker-compose.jakub.override.yml \
  run --rm -e OPENCLAW_GATEWAY_PORT=18789 openclaw-cli pairing list --channel telegram --json

docker compose \
  -f /Users/xvadur_mac/OpenClaw/docker/openclaw-source/docker-compose.yml \
  -f /Users/xvadur_mac/Jakub_Astro/ops/openclaw/docker-compose.jakub.override.yml \
  run --rm -e OPENCLAW_GATEWAY_PORT=18789 openclaw-cli channels status --json
```

## Supabase CRM

Stav:

- Supabase schema je spustena.
- Staging Worker vie zapisovat booking do Supabase.
- OpenClaw ma deterministicky CRM tool:

```bash
node /home/node/Jakub_Astro/ops/openclaw/tools/supabase-crm.mjs <tool> --json '<payload>'
```

Host verzia:

```bash
node /Users/xvadur_mac/Jakub_Astro/ops/openclaw/tools/supabase-crm.mjs <tool> --json '<payload>'
```

Overene:

- `crm.searchContacts` presiel z Docker gateway,
- `crm.writeAuditLog` vytvoril audit log v Supabase.

Poznamka:

- Service role key je ulozeny mimo repozitara. Nevypisovat ho do chatu, logov ani docs.
- Pred realnymi klientskymi datami treba zamknut dashboard/API a rotovat service role key.

## Listing/property workflow

Novy tool:

```bash
node /home/node/Jakub_Astro/ops/openclaw/tools/site-listings.mjs <tool> --json '<payload>'
```

Dostupne prikazy:

- `site.listings.list`
- `site.listings.audit`
- `site.listings.createDraft`
- `site.listings.prepareAddListing`
- `site.listings.prepareMarkSold`

Overene 2026-06-07:

- listing audit presiel z hosta aj z Docker gateway,
- aktualne listingy: `total: 7`, `available: 0`, `sold: 7`,
- ziadne duplicity, chybajuce povinne polia ani chybajuce fotky.

Pracovne priecinky mimo repozitara:

```text
/home/node/.openclaw/agent-workspaces/jakub-olsa/property-drafts
/home/node/.openclaw/agent-workspaces/jakub-olsa/approval-queue
/home/node/.openclaw/agent-workspaces/jakub-olsa/media-inbox
/home/node/.openclaw/agent-workspaces/jakub-olsa/web-patches
```

Verejne zmeny listingov stale vyzaduju approval:

- pridanie ponuky,
- zmena fotiek,
- zmena public copy,
- presun do predanych,
- commit/push/deploy.

## Booking/OpenClaw handoff

Stav:

- Cloudflare Tunnel existuje:
  - id: `350e365a-37f3-436d-8747-6ab0dd6efc8d`
  - hostname: `openclaw.jakubolsa.sk`
  - origin: `http://127.0.0.1:18789`
- Staging Worker ma nastavene `OPENCLAW_HOOK_URL` a `OPENCLAW_HOOK_TOKEN`.
- Direct hook smoke test presiel:
  - bez tokenu `401`,
  - s tokenom `200`,
  - run id `66f863f3-6682-4f6a-8f55-fd16a9b87bd4`.

Este treba:

- spustit plny staging booking E2E:
  - `/rezervacia/`
  - Google Calendar event,
  - Supabase CRM zaznam,
  - Telegram notifikacia,
  - OpenClaw handoff.

## Co treba zajtra / najblizsie

1. Telegram inbound smoke test:
   - poslat `ping` do `@jakub_reality_bot`,
   - potom skusit vetu typu: `Pridaj klienta Novak, chce predat byt v Ruzinove, volat zajtra.`

2. Plny booking E2E na stagingu:
   - overit calendar -> Supabase -> Telegram -> OpenClaw.

3. Security:
   - zamknut `openclaw.jakubolsa.sk` cez Cloudflare Access alebo service-token rezim,
   - zamknut `/dashboard/*` a `/api/dashboard/*`,
   - pred realnymi datami rotovat Supabase service role key.

4. OpenClaw agent workflow polish:
   - odpovede Jakubovi kratke a prakticke,
   - CRM notes/tasks/follow-upy cez Supabase,
   - listing drafty cez `site-listings.mjs`,
   - web patch iba cez approval.

5. Dashboard:
   - zatial netlacit,
   - po auth napojit na Supabase CRM real data.

6. Web business polish:
   - copy,
   - BOSEN Group positioning,
   - recenzie,
   - predane/aktualne nehnutelnosti,
   - SEO/AI discoverability,
   - GDPR.

## Bezpecnostne pravidlo

Nikdy nevypisovat ani necommitovat:

- Cloudflare tokeny,
- Google OAuth secrety,
- Telegram bot token,
- Supabase service role key,
- OpenClaw hook token,
- API keys.

Vsetky tieto veci maju byt iba v Cloudflare secrets alebo mimo repozitara v OpenClaw state.
