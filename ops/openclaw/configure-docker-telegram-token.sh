#!/usr/bin/env zsh
set -euo pipefail

COMPOSE_FILE="/Users/xvadur_mac/OpenClaw/docker/openclaw-source/docker-compose.yml"
OVERRIDE_FILE="/Users/xvadur_mac/Jakub_Astro/ops/openclaw/docker-compose.jakub.override.yml"
TOKEN_FILE="/Users/xvadur_mac/OpenClaw/docker/state/openclaw-config/credentials/jakub-telegram-bot-token"
EXPECTED_USERNAME="${EXPECTED_TELEGRAM_USERNAME:-jakub_reality_bot}"
TOKEN_DIR="$(dirname "$TOKEN_FILE")"
TMP_TOKEN_FILE=""

cleanup() {
  if [[ -n "${TMP_TOKEN_FILE:-}" && -f "$TMP_TOKEN_FILE" ]]; then
    rm -f "$TMP_TOKEN_FILE"
  fi
}
trap cleanup EXIT

read_token() {
  local token=""
  if [[ ! -t 0 ]]; then
    token="$(cat | tr -d '\r' | head -n 1)"
  fi
  if [[ -z "$token" ]] && command -v pbpaste >/dev/null 2>&1; then
    token="$(pbpaste | tr -d '\r' | head -n 1)"
  fi
  printf '%s' "$token"
}

TOKEN="$(read_token)"

if [[ ! "$TOKEN" =~ '^[0-9]{6,}:[A-Za-z0-9_-]{25,}$' ]]; then
  echo "Clipboard/stdin neobsahuje platny Telegram bot token." >&2
  exit 1
fi

mkdir -p "$TOKEN_DIR"
chmod 700 "$TOKEN_DIR"
TMP_TOKEN_FILE="$(mktemp "${TOKEN_FILE}.tmp.XXXXXX")"
printf '%s\n' "$TOKEN" > "$TMP_TOKEN_FILE"
chmod 600 "$TMP_TOKEN_FILE"

USERNAME="$(
  TELEGRAM_TOKEN_FILE="$TMP_TOKEN_FILE" node <<'NODE'
const fs = require("node:fs");

const tokenFile = process.env.TELEGRAM_TOKEN_FILE;
const token = fs.readFileSync(tokenFile, "utf8").trim();
const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
const body = await response.json();
if (!body.ok) {
  process.exit(2);
}
process.stdout.write(body.result?.username || "");
NODE
)"

if [[ "$USERNAME" != "$EXPECTED_USERNAME" ]]; then
  echo "Token patri botovi '$USERNAME', nie '$EXPECTED_USERNAME'." >&2
  exit 1
fi

mv "$TMP_TOKEN_FILE" "$TOKEN_FILE"
TMP_TOKEN_FILE=""
chmod 600 "$TOKEN_FILE"

docker compose \
  -f "$COMPOSE_FILE" \
  -f "$OVERRIDE_FILE" \
  run --rm -e OPENCLAW_GATEWAY_PORT=18789 openclaw-cli channels add \
  --channel telegram \
  --account default \
  --name Jakub \
  --token-file /home/node/.openclaw/credentials/jakub-telegram-bot-token

docker compose \
  -f "$COMPOSE_FILE" \
  -f "$OVERRIDE_FILE" \
  run --rm -e OPENCLAW_GATEWAY_PORT=18789 openclaw-cli agents bind \
  --agent jakub-olsa \
  --bind telegram \
  --json >/dev/null

docker compose \
  -f "$COMPOSE_FILE" \
  -f "$OVERRIDE_FILE" \
  restart openclaw-gateway

docker compose \
  -f "$COMPOSE_FILE" \
  -f "$OVERRIDE_FILE" \
  run --rm -e OPENCLAW_GATEWAY_PORT=18789 openclaw-cli channels capabilities --channel telegram

echo "Docker Telegram channel je nakonfigurovany pre @$USERNAME."
