# OpenClaw ops pre Jakuba

Tento adresar drzi pripravene podklady pre samostatneho OpenClaw agenta pre Jakuba Olsu. Neobsahuje ziadne secrety.

Aktualny lokalny stav 2026-06-03:

- OpenClaw CLI je na stroji dostupny, nebolo treba ho stahovat.
- Gateway bezi lokalne na `http://127.0.0.1:18789/`.
- Vytvoreny je oddeleny agent `jakub-olsa`.
- Agent workspace je mimo weboveho repozitara: `/Users/xvadur_mac/OpenClaw/workspaces/jakub-olsa`.
- Docker runtime je dostupny cez user-local Docker CLI + Colima.
- Docker OpenClaw gateway bezi oddelene na `http://127.0.0.1:18889/`.
- Docker OpenClaw source checkout: `/Users/xvadur_mac/OpenClaw/docker/openclaw-source`.
- Docker config: `/Users/xvadur_mac/OpenClaw/docker/state/openclaw-config`.
- Docker workspace: `/Users/xvadur_mac/OpenClaw/docker/workspaces/docker-openclaw`.
- Docker agent `jakub-olsa` je vytvoreny aj v Docker state.
- Jakub Astro repo je pre OpenClaw Docker agenta dostupne cez mount:
  - host: `/Users/xvadur_mac/Jakub_Astro`,
  - container: `/home/node/Jakub_Astro`.
- Portable compose override pre tento mount je v `ops/openclaw/docker-compose.jakub.override.yml`.
- Telegram channel este nie je pripojeny, lebo chyba `TELEGRAM_BOT_TOKEN`.
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

Docker pilot nepouziva host port `18789`, aby nekolidoval s existujucim LaunchAgent gateway.

```bash
curl -fsS http://127.0.0.1:18889/healthz
curl -fsS http://127.0.0.1:18889/readyz
docker compose -f /Users/xvadur_mac/OpenClaw/docker/openclaw-source/docker-compose.yml ps
```

CLI prikazy spustane v Docker network namespace potrebuju interny port `18789`, aj ked host port je `18889`:

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
