# OpenClaw + Telegram runbook pre Jakuba

Posledná aktualizácia: 6. jún 2026

## Cieľ stretnutia

- Prejsť s Jakubom aktuálny web.
- Ukázať mu, ako môže fungovať Telegram/OpenClaw kanál.
- Zachovať web bezpečný: žiadne Telegram tokeny v prehliadači ani v repozitári.

## Aktuálny stav

- Web je Astro projekt v `/Users/xvadur_mac/Jakub_Astro`
  (`/Users/xvadur_mac/Diera/active/jakub/Jakub_Astro`).
- GitHub repo: `xvadur/Jakub_astroweb`.
- Aktuálna vývojová vetva: `staging`.
- Docker OpenClaw gateway je aktuálny runtime na `http://127.0.0.1:18789/`.
- Telegram bot cieľ pre OpenClaw: `@jakub_reality_bot`.
- Docker Telegram channel je nakonfigurovaný cez tokenFile v Docker OpenClaw state.
- MacBook OpenClaw state obsahoval pôvodný token a `telegram-default-allowFrom.json`; oboje bolo prenesené do Docker state 6. júna 2026.
- Pairing request od Jakuba bol schválený v Docker OpenClaw 6. júna 2026; `pairing list` je po schválení prázdny.
- Routing binding už je v Docker configu: `telegram -> jakub-olsa`.
- Outbound test správa Jakubovi z Docker runtime bola poslaná 6. júna 2026 cez OpenClaw message tool (`messageId=19`).
- Staging Worker `jakubastroweb-staging` má od 6. júna 2026 nastavené Telegram secrets pre priame notifikácie po úspešnej rezervácii z `/rezervacia/`.
- Nasadený web ešte nemá plný OpenClaw handoff, kým lokálny Docker `/hooks/agent` nebude dostupný cez verejný HTTPS endpoint, napríklad Cloudflare Tunnel + Access.
- `openclaw channels status --deep` môže ukazovať `disconnected`, aj keď je bot nakonfigurovaný a beží v polling móde; rozhodujúci smoke test je inbound/outbound Telegram správa.
- OpenClaw model auth treba pred plným demom obnoviť:

```bash
openclaw models auth login --provider openai-codex
```

## Docker stav pre Jakub onboarding

Overené 6. júna 2026:

- Docker OpenClaw gateway beží na host porte `18789` a je healthy.
- Docker agent `jakub-olsa` existuje a smoke test cez `openai/gpt-5.5` prešiel.
- Jakub Astro repo je mountnuté v kontajneri na `/home/node/Jakub_Astro`.
- Routing binding je nastavený a overený: `telegram -> jakub-olsa`.
- Docker Telegram channel je nakonfigurovaný a beží v polling mode.
- Probe overenie vrátilo `@jakub_reality_bot` (`jakubolsa_reality`) a dostupné akcie `send`, `broadcast`, `poll`, `react`, `delete`, `edit`.

Docker dashboard otvorí helper bez vypisovania gateway tokenu:

```bash
/Users/xvadur_mac/Jakub_Astro/ops/openclaw/open-docker-dashboard.sh
```

Keď je BotFather token pre `@jakub_reality_bot` v clipboarde, Docker Telegram channel nastaví helper:

```bash
pbpaste | /Users/xvadur_mac/Jakub_Astro/ops/openclaw/configure-docker-telegram-token.sh
```

## Dva odlišné Telegram tokeny

V tomto setup-e môžu existovať dva Telegram bot tokeny:

- OpenClaw/Jakub bot token: pripája osobný OpenClaw runtime na Telegram, aby si mu vedel písať a dávať pokyny.
- Web lead token: používa ho Cloudflare Worker v `ops/telegram-worker`, aby web poslal notifikáciu po odoslaní formulára.

Môžu byť rovnaké, ale praktickejšie je mať ich oddelené. OpenClaw bot má operátorské schopnosti, lead bot má iba posielať upozornenia.

## Nahodenie alebo výmena OpenClaw Telegram tokenu

Token nedávať do histórie shellu ani do repozitára. `--token-file` v OpenClaw nie je jednorazový import, ale trvalá referencia na súbor. Pre Docker použiť helper, ktorý token uloží mimo repozitára do bind-mounted OpenClaw state a zapíše channel config:

```bash
pbpaste | /Users/xvadur_mac/Jakub_Astro/ops/openclaw/configure-docker-telegram-token.sh
```

Ručný host-side ekvivalent, ak by sa nastavoval mimo Dockeru:

```bash
TOKEN_FILE="$HOME/.openclaw/credentials/jakub-telegram-bot-token"
mkdir -p "$(dirname "$TOKEN_FILE")"
chmod 700 "$(dirname "$TOKEN_FILE")"
nano "$TOKEN_FILE"
chmod 600 "$TOKEN_FILE"
openclaw channels add --channel telegram --account default --name Jakub --token-file "$TOKEN_FILE"
```

Potom reštartovať gateway a overiť Telegram:

```bash
openclaw gateway restart
openclaw status
openclaw channels capabilities --channel telegram
openclaw health
```

## Web preview pri stole

```bash
bun install
bun run dev -- --host 127.0.0.1
```

Otvoriť:

```text
http://127.0.0.1:4323/
```

Build kontrola:

```bash
bun run build
```

## Telegram pairing pre Jakuba

1. Jakub otvorí v Telegrame `https://t.me/jakub_reality_bot`.
2. Stlačí `Start` alebo pošle krátku správu, napríklad `Ahoj, tu Jakub`.
3. Na tomto Macu skontrolovať pending pairing. Ak je zoznam prázdny, nech Jakub pošle ešte jednu správu botovi:

```bash
openclaw pairing list --channel telegram --json
```

4. Ak OpenClaw vráti pairing code, schváliť ho:

```bash
openclaw pairing approve --channel telegram <PAIRING_CODE> --notify
```

5. Overiť, či sa dá poslať testovacia správa:

```bash
openclaw message send --channel telegram --target <JAKUB_CHAT_ID> --message "Ahoj Jakub, OpenClaw je pripojený." --json
```

Ak sa pairing request nezobrazí, vytiahnuť chat ID cez Telegram Bot API `getUpdates` z lokálnej konfigurácie, ale token nevypisovať ani neukladať do repa.

Stav 6. júna 2026: Docker runtime zachytil pending request od Jakuba a pairing bol schválený bez `--notify`. Outbound smoke test cez Docker OpenClaw prešiel správou:

```bash
docker compose \
  -f /Users/xvadur_mac/OpenClaw/docker/openclaw-source/docker-compose.yml \
  -f /Users/xvadur_mac/Jakub_Astro/ops/openclaw/docker-compose.jakub.override.yml \
  run --rm -e OPENCLAW_GATEWAY_PORT=18789 openclaw-cli message send \
  --channel telegram \
  --target <JAKUB_CHAT_ID> \
  --message "Ahoj Jakub, len technicky testujem napojenie OpenClaw na Telegram. Nemusíš nič robiť."
```

Výsledok: Telegram `messageId=19`.

## Lead notifikácie z webu do Telegramu

Aktuálna produkčná cesta pre rezervačný wizard je priamo v hlavnom Cloudflare Workeri:

```text
Website /rezervacia
  -> Cloudflare Worker workers/site-worker.js /api/book
  -> Google Calendar event, ak sú nastavené Google secrets
  -> Telegram Bot API, ak sú nastavené Telegram secrets
  -> OpenClaw /hooks/agent, ak je nastavený verejný OpenClaw hook
```

Staging stav 6. júna 2026:

- `jakubastroweb-staging` má nastavené `TELEGRAM_BOT_TOKEN` a `TELEGRAM_CHAT_ID`.
- `/api/health` prešiel.
- `/api/availability?date=2026-06-08` vracia `mode: "google"`.
- Reálny `/api/book` po potvrdení odošle Jakubovi Telegram správu s lead detailmi.

Secrets sa nastavujú na hlavný Worker:

```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN --name jakubastroweb-staging
npx wrangler secret put TELEGRAM_CHAT_ID --name jakubastroweb-staging
```

Starý `ops/telegram-worker` zostáva iba ako samostatná minimalistická šablóna, ak by bolo treba oddeliť lead-notifikačný Worker od hlavného webového Workera.

## Web booking do OpenClaw

Lokálny Docker OpenClaw hook beží na:

```text
http://127.0.0.1:18789/hooks/agent
```

Toto je použiteľné iba pre lokálne E2E testy. Nasadený Cloudflare Worker potrebuje verejnú HTTPS adresu, nie `localhost`. Odporúčaný ďalší krok je Cloudflare Tunnel + Access pred `/hooks/agent`, potom nastaviť staging secrets:

```bash
npx wrangler secret put OPENCLAW_HOOK_URL --name jakubastroweb-staging
npx wrangler secret put OPENCLAW_HOOK_TOKEN --name jakubastroweb-staging
npx wrangler secret put OPENCLAW_DELIVER --name jakubastroweb-staging
npx wrangler secret put OPENCLAW_DELIVERY_CHANNEL --name jakubastroweb-staging
npx wrangler secret put OPENCLAW_DELIVERY_TO --name jakubastroweb-staging
```

Odporúčané hodnoty pre fallback oznámenie z OpenClaw runu:

```text
OPENCLAW_DELIVER=announce
OPENCLAW_DELIVERY_CHANNEL=telegram
OPENCLAW_DELIVERY_TO=<Jakub chat id alebo trusted group id>
```

## Bezpečnostné pravidlá

- Telegram bot token nikdy nepatrí do browser JavaScriptu, `.env.example`, README ani GitHub issues.
- Do GitHubu patria len runbooky, príklady a verejné URL endpointu.
- Pred pridaním Jakuba do allowlistu si ujasniť, čo smie OpenClaw robiť za neho: iba chat a briefing, alebo aj tool execution.
- Pre skupinu s Jakubom ponechať `requireMention: true`, aby OpenClaw nereagoval na každú bežnú správu v skupine.
