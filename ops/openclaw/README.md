# OpenClaw ops pre Jakuba

Tento adresar drzi pripravene podklady pre samostatneho OpenClaw agenta pre Jakuba Olsu. Neobsahuje ziadne secrety.

Aktualny lokalny stav 2026-06-06:

- OpenClaw CLI je na stroji dostupny, nebolo treba ho stahovat.
- Docker OpenClaw gateway bezi lokalne na `http://127.0.0.1:18789/`.
- Vytvoreny je oddeleny agent `jakub-olsa`.
- Agent workspace je mimo weboveho repozitara: `/Users/xvadur_mac/OpenClaw/workspaces/jakub-olsa`.
- Docker runtime je dostupny cez user-local Docker CLI + Colima.
- Docker OpenClaw bridge port je mapovany na `http://127.0.0.1:18890/`.
- Docker OpenClaw source checkout: `/Users/xvadur_mac/OpenClaw/docker/openclaw-source`.
- Docker config: `/Users/xvadur_mac/OpenClaw/docker/state/openclaw-config`.
- Docker workspace: `/Users/xvadur_mac/OpenClaw/docker/workspaces/docker-openclaw`.
- Docker agent `jakub-olsa` je vytvoreny aj v Docker state.
- Docker agent `jakub-olsa` ma routing binding `telegram -> jakub-olsa`, aby Telegram po konfiguracii kanala nespadol na default `main` agenta.
- Jakub Astro repo je pre OpenClaw Docker agenta dostupne cez mount:
  - host: `/Users/xvadur_mac/Jakub_Astro`,
  - container: `/home/node/Jakub_Astro`.
- Portable compose override pre tento mount je v `ops/openclaw/docker-compose.jakub.override.yml`.
- Telegram channel v Docker state este nie je pripojeny, lebo v Docker OpenClaw configu chyba Telegram bot token. Kontrola 2026-06-06 vratila `channels: {}`.
- Webovy Worker je pripraveny poslat booking payload do OpenClaw webhooku, ked budu nastavene staging secrets.

## Subory

- `jakub-agent/AGENTS.md` - pracovny system prompt / pravidla Jakub agenta.
- `jakub-agent/TOOLS.md` - lokalne tool pravidla a integracne povrchy.
- `docker-compose.jakub.override.yml` - portable Docker Compose override, ktory mountne Jakub Astro repo do OpenClaw kontajnera.
- `supabase/SUPABASE_SCHEMA.sql` - prvy navrh CRM schemy pre Supabase.

## Kriticka architektura

```text
Website /rezervacia
  -> Cloudflare Worker /api/book
  -> Google Calendar event, ak su nastavene Google secrets
  -> Telegram notifikacia, ak su nastavene Telegram secrets
  -> OpenClaw handoff cez /hooks/agent, ak su nastavene OpenClaw secrets
```

OpenClaw je vedlajsi efekt po bookingu. Nesmie byt v kritickej transakcii rezervacie.

## Docker pilot

Docker runtime uz pouziva host port `18789`; povodny host LaunchAgent gateway musi ostat vypnuty, aby nekolidoval.

```bash
curl -fsS http://127.0.0.1:18789/healthz
curl -fsS http://127.0.0.1:18789/readyz
docker compose -f /Users/xvadur_mac/OpenClaw/docker/openclaw-source/docker-compose.yml ps
```

## Persistentny Docker runtime

Cielovy stav pre Jakuba je:

- host OpenClaw LaunchAgent `ai.openclaw.gateway` je disabled, aby nebral port `18789`,
- Docker/Colima je aktivny runtime,
- OpenClaw Docker gateway bezi na `http://127.0.0.1:18789/`,
- Docker container ma `restart: unless-stopped`,
- macOS LaunchAgent `ai.openclaw.docker` kazde 2 minuty overi Docker/Colima a `openclaw-gateway`.

Watchdog script:

```bash
/Users/xvadur_mac/Jakub_Astro/ops/openclaw/ensure-docker-openclaw.sh
```

LaunchAgent template:

```bash
/Users/xvadur_mac/Jakub_Astro/ops/openclaw/launchd/ai.openclaw.docker.plist
```

Logy:

```bash
/Users/xvadur_mac/Library/Logs/openclaw/docker-watchdog.log
/Users/xvadur_mac/Library/Logs/openclaw/docker-watchdog.launchd.out.log
/Users/xvadur_mac/Library/Logs/openclaw/docker-watchdog.launchd.err.log
```

Open Docker dashboard bez vypisovania tokenu do chatu:

```bash
/Users/xvadur_mac/Jakub_Astro/ops/openclaw/open-docker-dashboard.sh
```

Prehliadacovy dashboard je na host porte `18789`. CLI prikazy spustane v Docker network namespace tiez pouzivaju interny port `18789`.

CLI prikazy spustane v Docker network namespace:

```bash
docker compose -f /Users/xvadur_mac/OpenClaw/docker/openclaw-source/docker-compose.yml \
  run --rm -e OPENCLAW_GATEWAY_PORT=18789 openclaw-cli agents list
```

Stop/start:

```bash
docker compose -f /Users/xvadur_mac/OpenClaw/docker/openclaw-source/docker-compose.yml stop openclaw-gateway
docker compose -f /Users/xvadur_mac/OpenClaw/docker/openclaw-source/docker-compose.yml up -d openclaw-gateway
```

## Pripojenie Jakub Astro repa do OpenClaw Dockeru

Aktualny stroj ma OpenClaw source compose upraveny priamo. Na inom Macu pouzi portable override z tohto repozitara:

```bash
export JAKUB_ASTRO_REPO_DIR=/Users/xvadur_mac/Jakub_Astro

docker compose \
  -f /Users/xvadur_mac/OpenClaw/docker/openclaw-source/docker-compose.yml \
  -f /Users/xvadur_mac/Jakub_Astro/ops/openclaw/docker-compose.jakub.override.yml \
  up -d --force-recreate openclaw-gateway
```

Potom vytvor pohodlny symlink v agent workspace:

```bash
docker exec openclaw-source-openclaw-gateway-1 sh -lc \
  'ln -sfn /home/node/Jakub_Astro /home/node/.openclaw/agent-workspaces/jakub-olsa/Jakub_Astro'
```

Smoke test, ktory presiel 2026-06-05:

```bash
docker compose \
  -f /Users/xvadur_mac/OpenClaw/docker/openclaw-source/docker-compose.yml \
  -f /Users/xvadur_mac/Jakub_Astro/ops/openclaw/docker-compose.jakub.override.yml \
  run --rm -e OPENCLAW_GATEWAY_PORT=18789 openclaw-cli agent \
  --agent jakub-olsa \
  --message 'Over pripojenie na Jakub Astro repo. Precitaj iba /home/node/Jakub_Astro/package.json a /home/node/Jakub_Astro/astro.config.mjs. Necitaj .env ani ziadne secrety. Odpovedz kratko po slovensky: CONNECTED, nazov package, a ci existuje astro.config.mjs.' \
  --timeout 180 \
  --json
```

Ocakavane: `CONNECTED`, package `clients-jakub-olsa`, `astro.config.mjs` existuje.

Smoke test 2026-06-05 vecer presiel aj priamym agent callom:

```text
Jakub Docker agent pripraveny.
```

## Telegram v Docker OpenClaw

Overene 2026-06-05:

- Docker gateway bezi a je healthy.
- Docker agent `jakub-olsa` funguje cez `openai/gpt-5.5`.
- Routing binding je nastaveny:

```text
jakub-olsa <- telegram
```

Este chyba samotny Telegram channel token v Docker OpenClaw state. Ked bude token dostupny v subore mimo repozitara, nastavenie:

```bash
pbpaste | /Users/xvadur_mac/Jakub_Astro/ops/openclaw/configure-docker-telegram-token.sh
```

Potom Jakub posle botovi spravu a pairing sa overi cez:

```bash
docker compose \
  -f /Users/xvadur_mac/OpenClaw/docker/openclaw-source/docker-compose.yml \
  -f /Users/xvadur_mac/Jakub_Astro/ops/openclaw/docker-compose.jakub.override.yml \
  run --rm -e OPENCLAW_GATEWAY_PORT=18789 openclaw-cli pairing list --channel telegram --json
```

## Secrets mimo repozitara

Cloudflare staging secrets:

```bash
npx wrangler secret put OPENCLAW_HOOK_URL --name jakubastroweb-staging
npx wrangler secret put OPENCLAW_HOOK_TOKEN --name jakubastroweb-staging
npx wrangler secret put OPENCLAW_DELIVERY_TO --name jakubastroweb-staging
npx wrangler secret put OPENCLAW_CF_ACCESS_CLIENT_ID --name jakubastroweb-staging
npx wrangler secret put OPENCLAW_CF_ACCESS_CLIENT_SECRET --name jakubastroweb-staging
```

`OPENCLAW_DELIVERY_TO` a Cloudflare Access secrets su volitelne. Ak OpenClaw nema posielat fallback odpoved do Telegramu, nechaj `OPENCLAW_DELIVER`, `OPENCLAW_DELIVERY_CHANNEL` a `OPENCLAW_DELIVERY_TO` prazdne.

## Dolezite zdroje

- OpenClaw overview: `https://docs.openclaw.ai/`
- OpenClaw webhook endpointy: `https://docs.openclaw.ai/automation/cron-jobs#webhooks`
- OpenClaw Telegram channel: `https://docs.openclaw.ai/channels/telegram`
