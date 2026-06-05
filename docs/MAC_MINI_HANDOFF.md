# Mac mini handoff

Posledná aktualizácia: 5. jún 2026

## Cieľ

Preniesť projekt Jakub Astro a jeho lokálne runtime credentials z MacBooku na Mac mini tak, aby GitHub ostal zdroj pravdy pre kód a žiadny token neskončil v repozitári.

## Čo ide cez GitHub

Tieto veci patria do repozitára:

- Astro web a statické assets,
- `ops/telegram-worker`,
- runbooky v `docs/`,
- `.env.example` a `.dev.vars.example`,
- postupy pre Cloudflare, Telegram, Google Calendar a OpenClaw.

Po pushi na GitHub stačí na Mac mini:

```bash
git clone https://github.com/xvadur/Jakub_astroweb.git
cd Jakub_astroweb
bun install
bun run build
```

Ak repo na Mac mini už existuje:

```bash
cd /path/to/Jakub_astroweb
git pull --ff-only
bun install
bun run build
```

## Čo nejde cez GitHub

Tieto veci sa prenášajú len bezpečným kanálom alebo sa vytvoria nanovo:

- `~/.openclaw/credentials/jakub-telegram-bot-token`,
- Cloudflare Wrangler OAuth profil v `~/Library/Preferences/.wrangler/`,
- `.secrets/google-oauth-desktop-client.json`,
- akékoľvek `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, Cloudflare API tokeny, OAuth refresh tokeny,
- lokálne `.env`, `.env.production`, `ops/telegram-worker/.dev.vars`, `ops/telegram-worker/wrangler.toml`.

## MacBook aktuálny stav

- Wrangler login je hotový pre účet `yksvadur.ja@gmail.com`.
- Cloudflare account ID: `002b0727daee60448cf72c0b08f7810f`.
- OpenClaw Telegram bot je `@jakub_reality_bot`.
- OpenClaw token file je `~/.openclaw/credentials/jakub-telegram-bot-token`.
- Google Calendar OAuth client handoff je popísaný v `docs/GOOGLE_CALENDAR_HANDOFF.md`.

## Odporúčaný prenos credentials

Najbezpečnejšie je neprenášať celé `.openclaw` ani celý Wrangler profil naslepo.

1. Na Mac mini nainštalovať/pripraviť nástroje:

```bash
npm install -g openclaw
npx wrangler@latest login
```

2. Na Mac mini vytvoriť OpenClaw Telegram token súbor:

```bash
TOKEN_FILE="$HOME/.openclaw/credentials/jakub-telegram-bot-token"
mkdir -p "$(dirname "$TOKEN_FILE")"
chmod 700 "$(dirname "$TOKEN_FILE")"
nano "$TOKEN_FILE"
chmod 600 "$TOKEN_FILE"
openclaw channels add --channel telegram --account default --name Jakub --token-file "$TOKEN_FILE"
openclaw gateway restart
```

3. Overiť runtime:

```bash
openclaw status
openclaw channels capabilities --channel telegram
npx wrangler@latest whoami
```

4. Ak sa má prenášať Google Calendar, pokračovať podľa `docs/GOOGLE_CALENDAR_HANDOFF.md`.

## Ak bude fungovať SSH

Keď bude známy SSH target Mac mini, dá sa preniesť iba projekt alebo bezpečne vybrané secrets.

Projekt radšej cez GitHub:

```bash
ssh <user>@<mac-mini-host> 'git clone https://github.com/xvadur/Jakub_astroweb.git ~/Jakub_astroweb || (cd ~/Jakub_astroweb && git pull --ff-only)'
```

Secrets kopírovať iba po výslovnom potvrdení a iba konkrétne súbory:

```bash
scp ~/.openclaw/credentials/jakub-telegram-bot-token <user>@<mac-mini-host>:~/.openclaw/credentials/jakub-telegram-bot-token
```

Na cieľovom stroji vždy skontrolovať:

```bash
chmod 700 ~/.openclaw/credentials
chmod 600 ~/.openclaw/credentials/jakub-telegram-bot-token
```

## Kontrola po presune

```bash
cd ~/Jakub_astroweb
git status --short --branch
bun run build
npx wrangler@latest whoami
openclaw status
openclaw pairing list --channel telegram --json
```

Predtým, než Mac mini prevezme produkčnú prevádzku, poslať test správu cez Telegram a urobiť test formulára na lokálny alebo produkčný lead endpoint.
