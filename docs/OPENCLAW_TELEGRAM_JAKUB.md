# OpenClaw + Telegram runbook pre Jakuba

Posledná aktualizácia: 5. jún 2026

## Cieľ stretnutia

- Prejsť s Jakubom aktuálny web.
- Ukázať mu, ako môže fungovať Telegram/OpenClaw kanál.
- Zachovať web bezpečný: žiadne Telegram tokeny v prehliadači ani v repozitári.

## Aktuálny stav

- Web je Astro projekt v `/Users/_xvadur/Jakub_astroweb`.
- GitHub repo: `xvadur/Jakub_astroweb`.
- Aktuálna vetva: `main`.
- OpenClaw gateway beží lokálne na `ws://127.0.0.1:18789`.
- Telegram bot pripojený k OpenClaw: `@jakub_reality_bot` (`jakub_realitky`).
- Telegram token je uložený lokálne v `~/.openclaw/credentials/jakub-telegram-bot-token` s právami `600`.
- Telegram pairing s Jakubom je podľa operátora hotový; pred produkčným použitím overiť testovacou správou.
- `openclaw channels status --deep` môže ukazovať `disconnected`, aj keď je bot nakonfigurovaný a beží v polling móde; rozhodujúci smoke test je inbound/outbound Telegram správa.
- OpenClaw model auth treba pred plným demom obnoviť:

```bash
openclaw models auth login --provider openai-codex
```

## Dva odlišné Telegram tokeny

V tomto setup-e môžu existovať dva Telegram bot tokeny:

- OpenClaw/Jakub bot token: pripája osobný OpenClaw runtime na Telegram, aby si mu vedel písať a dávať pokyny.
- Web lead token: používa ho Cloudflare Worker v `ops/telegram-worker`, aby web poslal notifikáciu po odoslaní formulára.

Môžu byť rovnaké, ale praktickejšie je mať ich oddelené. OpenClaw bot má operátorské schopnosti, lead bot má iba posielať upozornenia.

## Nahodenie alebo výmena OpenClaw Telegram tokenu

Token nedávať do histórie shellu ani do repozitára. `--token-file` v OpenClaw nie je jednorazový import, ale trvalá referencia na súbor. Preto musí token zostať v lokálnom credentials súbore mimo repozitára:

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

Stav 5. júna 2026 večer: operátor potvrdil, že Telegram a OpenClaw sú spárované. Pri presune na Mac mini treba pairing a odoslanie test správy overiť znova.

## Lead notifikácie z webu do Telegramu

Najjednoduchšia produkčná cesta je:

```text
Website form -> Cloudflare Worker -> Telegram Bot API -> Telegram chat/group
```

Worker je pripravený v `ops/telegram-worker`.

```bash
cd ops/telegram-worker
cp wrangler.toml.example wrangler.toml
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put TELEGRAM_CHAT_ID
wrangler deploy
```

Potom v Astro env nastaviť:

```bash
PUBLIC_LEAD_ENDPOINT=https://your-worker.your-subdomain.workers.dev
```

Po zmene env treba reštartovať dev server alebo znovu buildnúť web.

## Bezpečnostné pravidlá

- Telegram bot token nikdy nepatrí do browser JavaScriptu, `.env.example`, README ani GitHub issues.
- Do GitHubu patria len runbooky, príklady a verejné URL endpointu.
- Pred pridaním Jakuba do allowlistu si ujasniť, čo smie OpenClaw robiť za neho: iba chat a briefing, alebo aj tool execution.
- Pre skupinu s Jakubom ponechať `requireMention: true`, aby OpenClaw nereagoval na každú bežnú správu v skupine.
