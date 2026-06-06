#!/usr/bin/env zsh
set -euo pipefail

ENV_FILE="${OPENCLAW_DOCKER_ENV:-/Users/xvadur_mac/OpenClaw/docker/openclaw-source/.env}"

read_env_value() {
  local key="$1"
  awk -F= -v key="$key" '
    $1 == key {
      sub(/^[^=]*=/, "")
      gsub(/^"|"$/, "")
      print
      exit
    }
  ' "$ENV_FILE"
}

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing Docker OpenClaw env file: $ENV_FILE" >&2
  exit 1
fi

PORT="${OPENCLAW_GATEWAY_PORT:-$(read_env_value OPENCLAW_GATEWAY_PORT)}"
TOKEN="${OPENCLAW_GATEWAY_TOKEN:-$(read_env_value OPENCLAW_GATEWAY_TOKEN)}"

if [[ -z "${PORT:-}" ]]; then
  PORT="18789"
fi

if [[ -z "${TOKEN:-}" ]]; then
  echo "Missing OPENCLAW_GATEWAY_TOKEN in $ENV_FILE" >&2
  exit 1
fi

ENCODED_TOKEN="$(node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$TOKEN")"
URL="http://127.0.0.1:${PORT}/#token=${ENCODED_TOKEN}"

open "$URL"
echo "Opened Docker OpenClaw dashboard on http://127.0.0.1:${PORT}/"
