# OpenClaw runbook pre Jakubov web - 2026-06-03

Stav: OpenClaw bezi cez Docker runtime; secrety nie su ulozene v repozitari.

Poznamka 2026-06-06: starsie casti tohto runbooku spominali host port `18889`. Aktualny Docker runtime pouziva host port `18789`; povodny host LaunchAgent gateway musi ostat vypnuty, aby nekolidoval.

## Co je uz hotove

- Lokalny OpenClaw CLI existuje: `/Users/xvadur_mac/.local/bin/openclaw`.
- Gateway bezi lokalne na `http://127.0.0.1:18789/`.
- Docker CLI + Colima su dostupne a Docker runtime bezi.
- Docker OpenClaw gateway bezi na `http://127.0.0.1:18789/`.
- Vytvoreny je oddeleny agent:

```text
agentId: jakub-olsa
workspace: /Users/xvadur_mac/OpenClaw/workspaces/jakub-olsa
agentDir: /Users/xvadur_mac/.openclaw/agents/jakub-olsa/agent
model: openai/gpt-5.5
```

- Webovy Cloudflare Worker ma non-blocking OpenClaw handoff po uspesnom `/api/book`.
- Handoff sa spusti iba ked su nastavene `OPENCLAW_HOOK_URL` a `OPENCLAW_HOOK_TOKEN`.
- Handoff je vedlajsi efekt cez `ctx.waitUntil`, takze nesmie pokazit booking transakciu.
- Docker OpenClaw hooks su lokalne zapnute:
  - endpoint: `http://127.0.0.1:18789/hooks/agent`,
  - default session: `agent:jakub-olsa:main`,
  - allowed agent ids: `jakub-olsa`,
  - hook token je mimo repozitara: `/Users/xvadur_mac/OpenClaw/docker/state/openclaw-config/secrets/jakub-hook-token.txt`.
- Pripravene su:
  - `ops/openclaw/jakub-agent/AGENTS.md`,
  - `ops/openclaw/jakub-agent/TOOLS.md`,
  - `ops/openclaw/supabase/SUPABASE_SCHEMA.sql`,
  - `docs/OPENCLAW_TOOL_CONTRACTS_2026-06-03.md`.

Docker pilot:

```text
source: /Users/xvadur_mac/OpenClaw/docker/openclaw-source
config: /Users/xvadur_mac/OpenClaw/docker/state/openclaw-config
workspace: /Users/xvadur_mac/OpenClaw/docker/workspaces/docker-openclaw
jakub astro host repo: /Users/xvadur_mac/Jakub_Astro
jakub astro container repo: /home/node/Jakub_Astro
host port: 18789
container port: 18789
image: ghcr.io/openclaw/openclaw:latest
```

Docker pilot status 2026-06-04:

- Gateway health/ready OK na `http://127.0.0.1:18789/`.
- Docker agent `jakub-olsa` workspace:
  `/Users/xvadur_mac/OpenClaw/docker/state/openclaw-config/agent-workspaces/jakub-olsa`.
- Jakub Astro repo je namountovane do Docker OpenClaw kontajnera:
  - host: `/Users/xvadur_mac/Jakub_Astro`,
  - container: `/home/node/Jakub_Astro`,
  - agent workspace symlink: `/home/node/.openclaw/agent-workspaces/jakub-olsa/Jakub_Astro`.
- Agent run smoke test presiel:

```bash
docker compose -f /Users/xvadur_mac/OpenClaw/docker/openclaw-source/docker-compose.yml \
  run --rm -e OPENCLAW_GATEWAY_PORT=18789 openclaw-cli agent \
  --agent jakub-olsa \
  --message 'Odpovedz presne jednym slovom: OK' \
  --timeout 180 \
  --json
```

Ocakavane: `status: ok` a odpoved `OK`.

- Astro repo connection smoke test presiel 2026-06-05:

```bash
docker compose -f /Users/xvadur_mac/OpenClaw/docker/openclaw-source/docker-compose.yml \
  run --rm -e OPENCLAW_GATEWAY_PORT=18789 openclaw-cli agent \
  --agent jakub-olsa \
  --message 'Over pripojenie na Jakub Astro repo. Precitaj iba /home/node/Jakub_Astro/package.json a /home/node/Jakub_Astro/astro.config.mjs. Necitaj .env ani ziadne secrety. Odpovedz kratko po slovensky: CONNECTED, nazov package, a ci existuje astro.config.mjs.' \
  --timeout 180 \
  --json
```

Ocakavane: `CONNECTED`, package `clients-jakub-olsa`, `astro.config.mjs` existuje.

- Docker hook smoke test presiel 2026-06-04:

```bash
TOKEN="$(tr -d '\n' < /Users/xvadur_mac/OpenClaw/docker/state/openclaw-config/secrets/jakub-hook-token.txt)"
curl -sS -X POST http://127.0.0.1:18789/hooks/agent \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"agentId":"jakub-olsa","name":"Hook smoke test","message":"Odpovedz presne jednym slovom: OK","deliver":false,"timeoutSeconds":120}'
```

Ocakavane: `{"ok":true,"runId":"..."}`. V session `agent:jakub-olsa:main` je ulozena odpoved `OK`.

- Lokalny Worker E2E test presiel 2026-06-04:
  - Worker bol spusteny lokalne na `http://127.0.0.1:8787` s docasnym env suborom mimo repozitara.
  - Google Calendar env boli vynutene prazdne, aby booking ostal v `mode: mock`.
  - `POST /api/book` vratil `200 OK` a payload `ok:true`, `bookingStatus: pending_calendar_config`.
  - `ctx.waitUntil` odovzdal booking do OpenClaw `/hooks/agent`.
  - OpenClaw session `agent:jakub-olsa:main` spracovala task `Jakub web booking`.
  - Agent zistil, ze vtedy dostupny HighLevel CRM connector vyzadoval reauth (`401 Reauthentication required`).
  - Agent nevytvoril CRM kontakt/lead/task, nemenil kalendar, neposlal klientsku spravu a nevykonal verejnu zmenu.
  - Agent vytvoril interny admin case:
    `/Users/xvadur_mac/OpenClaw/docker/state/openclaw-config/agent-workspaces/jakub-olsa/admin-cases/2026-06-04-web-booking-16edb862.md`.

Poznamka: pri Docker CLI aj host browser/curl pouzivaj gateway port `18789`.

## Co este chyba

- Public HTTPS cesta na lokalny OpenClaw hook.
- Cloudflare staging secrets.
- Deterministicke Supabase CRM tools pre OpenClaw.
- Auth/Access pred dashboardom pred realnymi klientskymi datami.
- `ripgrep` (`rg`) v OpenClaw agent workspace/image, aby agent nemusel fallbackovat na `find`.

## 1. Overit lokalny OpenClaw

```bash
openclaw status
openclaw agents list
```

Ocakavane:

- Gateway reachable,
- agent `jakub-olsa` existuje,
- Telegram channels este nemusia byt nakonfigurovane.

## 1b. Overit Docker OpenClaw pilot

Docker gateway host port je aktuálne `18789`; host LaunchAgent gateway ostáva vypnutý, aby nekolidoval.

```bash
curl -fsS http://127.0.0.1:18789/healthz
curl -fsS http://127.0.0.1:18789/readyz
docker compose -f /Users/xvadur_mac/OpenClaw/docker/openclaw-source/docker-compose.yml ps
```

Pre `openclaw-cli` v Compose pouzi interny port:

```bash
docker compose -f /Users/xvadur_mac/OpenClaw/docker/openclaw-source/docker-compose.yml \
  run --rm -e OPENCLAW_GATEWAY_PORT=18789 openclaw-cli agents list
```

Over model/auth route pre Docker agenta:

```bash
docker compose -f /Users/xvadur_mac/OpenClaw/docker/openclaw-source/docker-compose.yml \
  run --rm -e OPENCLAW_GATEWAY_PORT=18789 openclaw-cli models status \
  --agent jakub-olsa
```

Ocakavane:

```text
defaultModel: openai/gpt-5.5
runtimeAuthRoutes: usable
missingProvidersInUse: empty
```

## 2. Nahrat Jakubove agent pravidla do workspace

Repo source of truth:

```text
/Users/xvadur_mac/Jakub_Astro/ops/openclaw/jakub-agent/AGENTS.md
/Users/xvadur_mac/Jakub_Astro/ops/openclaw/jakub-agent/TOOLS.md
```

Aktualny agent workspace:

```text
/Users/xvadur_mac/OpenClaw/workspaces/jakub-olsa
```

Stav 2026-06-03: zakladne pravidla uz boli nahrate do realneho workspace. Pri dalsom update skopiruj alebo zosulad obsah promptov do:

```text
/Users/xvadur_mac/OpenClaw/workspaces/jakub-olsa/AGENTS.md
/Users/xvadur_mac/OpenClaw/workspaces/jakub-olsa/TOOLS.md
```

## 3. Zapnut / overit OpenClaw hooks

OpenClaw webhooky podla docs pouzivaju:

- `POST /hooks/wake`,
- `POST /hooks/agent`,
- header `Authorization: Bearer <token>` alebo `x-openclaw-token`.

Docker pilot ma hooks uz zapnute v:

```text
/Users/xvadur_mac/OpenClaw/docker/state/openclaw-config/openclaw.json
```

Token je ulozeny mimo repozitara:

```text
/Users/xvadur_mac/OpenClaw/docker/state/openclaw-config/secrets/jakub-hook-token.txt
```

Overenie bez zobrazenia tokenu:

```bash
jq '.hooks | {enabled, path, defaultSessionKey, allowedAgentIds, maxBodyBytes, hasToken: ((.token | type) == "string" and (.token | length) > 0)}' \
  /Users/xvadur_mac/OpenClaw/docker/state/openclaw-config/openclaw.json
```

Ocakavane:

```json
{
  "enabled": true,
  "path": "/hooks",
  "defaultSessionKey": "agent:jakub-olsa:main",
  "allowedAgentIds": ["jakub-olsa"],
  "maxBodyBytes": 262144,
  "hasToken": true
}
```

Ak by bolo treba hooks vytvorit znova, pouzi dedicated token. Token nedavaj do repozitara.

Vygeneruj dedicated hook token:

```bash
openssl rand -hex 32
```

Nastav hooks v Docker OpenClaw configu:

```bash
TOKEN="$(tr -d '\n' < /Users/xvadur_mac/OpenClaw/docker/state/openclaw-config/secrets/jakub-hook-token.txt)"
docker compose -f /Users/xvadur_mac/OpenClaw/docker/openclaw-source/docker-compose.yml \
  run --rm -e OPENCLAW_GATEWAY_PORT=18789 openclaw-cli config patch --stdin <<JSON
{
  "hooks": {
    "enabled": true,
    "path": "/hooks",
    "token": "$TOKEN",
    "defaultSessionKey": "agent:jakub-olsa:main",
    "allowedAgentIds": ["jakub-olsa"],
    "maxBodyBytes": 262144
  }
}
JSON
```

Restart:

```bash
docker compose -f /Users/xvadur_mac/OpenClaw/docker/openclaw-source/docker-compose.yml restart openclaw-gateway
curl -fsS http://127.0.0.1:18789/healthz
```

Lokalny test:

```bash
TOKEN="$(tr -d '\n' < /Users/xvadur_mac/OpenClaw/docker/state/openclaw-config/secrets/jakub-hook-token.txt)"
curl -sS -X POST http://127.0.0.1:18789/hooks/agent \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"agentId":"jakub-olsa","name":"Hook smoke test","message":"Odpovedz presne jednym slovom: OK","deliver":false,"timeoutSeconds":120}'
```

## 4. Vystavit hook ako public HTTPS endpoint

Cloudflare Worker nevie volat `127.0.0.1` na Adamovom stroji. Potrebna je public HTTPS cesta na OpenClaw Gateway, idealne s dalsou ochranou.

Preferovany smer:

```text
Cloudflare Tunnel / Access
  -> https://openclaw-jakub.<domain>/hooks/agent
  -> local http://127.0.0.1:18789/hooks/agent
```

Odporucanie:

- nechaj OpenClaw hook za Cloudflare Access,
- pouzi Cloudflare Access service token,
- Worker posle `CF-Access-Client-Id` a `CF-Access-Client-Secret`,
- OpenClaw hook stale vyzaduje vlastny `Authorization: Bearer <OPENCLAW_HOOK_TOKEN>`.

## 5. Nastavit staging secrets pre webovy Worker

Najprv iba staging:

```bash
npx wrangler secret put OPENCLAW_HOOK_URL --name jakubastroweb-staging
npx wrangler secret put OPENCLAW_HOOK_TOKEN --name jakubastroweb-staging
```

Volitelne, ak pouzijeme Cloudflare Access:

```bash
npx wrangler secret put OPENCLAW_CF_ACCESS_CLIENT_ID --name jakubastroweb-staging
npx wrangler secret put OPENCLAW_CF_ACCESS_CLIENT_SECRET --name jakubastroweb-staging
```

Volitelne, ak ma OpenClaw po isolated run poslat fallback spravu do Telegramu:

```bash
npx wrangler secret put OPENCLAW_DELIVER --name jakubastroweb-staging
npx wrangler secret put OPENCLAW_DELIVERY_CHANNEL --name jakubastroweb-staging
npx wrangler secret put OPENCLAW_DELIVERY_TO --name jakubastroweb-staging
```

Odporucane hodnoty az po otestovani:

```text
OPENCLAW_DELIVER=announce
OPENCLAW_DELIVERY_CHANNEL=telegram
OPENCLAW_DELIVERY_TO=<Jakub chat id alebo skupina>
```

## 6. Telegram bot pre Jakuba

1. V BotFather vytvor bot.
2. Uloz token mimo repozitara.
3. Posli botovi spravu alebo ho pridaj do skupiny.
4. Zisti chat id:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getUpdates"
```

5. Pridaj channel do OpenClaw:

```bash
TELEGRAM_BOT_TOKEN="PASTE_TOKEN" openclaw channels add \
  --channel telegram \
  --account jakub \
  --token "$TELEGRAM_BOT_TOKEN" \
  --name "Jakub Telegram"
```

6. Nabinduj channel na agenta:

```bash
openclaw agents bind --agent jakub-olsa --bind telegram:jakub
```

7. Over:

```bash
openclaw channels status --probe
openclaw agents list
```

## 7. Staging test web bookingu

Po nastaveni secrets:

```bash
npm run build
npm run deploy:staging
```

Test:

1. Otvor `https://staging.jakubolsa.sk/rezervacia/`.
2. Posli test booking.
3. Over:
   - klient vidi success,
   - Telegram notifikacia pride,
   - OpenClaw hook dostal system event,
   - agent `jakub-olsa` vyrobi lead summary alebo admin note,
   - ziadna produkcna web zmena neprebehla.

## 8. Produkcia az po review

Do produkcie nastav tieto secrets az po potvrdeni na stagingu:

```bash
npx wrangler secret put OPENCLAW_HOOK_URL --name jakubastroweb
npx wrangler secret put OPENCLAW_HOOK_TOKEN --name jakubastroweb
```

Produkcia stale musi dodrziavat:

```text
web mutation -> staging -> approval -> production
```

## Zdrojove docs

- OpenClaw overview: `https://docs.openclaw.ai/`
- OpenClaw webhooky: `https://docs.openclaw.ai/automation/cron-jobs#webhooks`
- OpenClaw Telegram: `https://docs.openclaw.ai/channels/telegram`
