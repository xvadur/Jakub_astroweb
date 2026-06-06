#!/usr/bin/env zsh
set -euo pipefail

export HOME="/Users/xvadur_mac"
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export DOCKER_CONTEXT="${DOCKER_CONTEXT:-colima}"
export JAKUB_ASTRO_REPO_DIR="${JAKUB_ASTRO_REPO_DIR:-/Users/xvadur_mac/Jakub_Astro}"

COMPOSE_FILE="/Users/xvadur_mac/OpenClaw/docker/openclaw-source/docker-compose.yml"
OVERRIDE_FILE="/Users/xvadur_mac/Jakub_Astro/ops/openclaw/docker-compose.jakub.override.yml"
ENV_FILE="/Users/xvadur_mac/OpenClaw/docker/openclaw-source/.env"
LOG_DIR="/Users/xvadur_mac/Library/Logs/openclaw"

mkdir -p "$LOG_DIR"

log() {
  printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" | tee -a "$LOG_DIR/docker-watchdog.log"
}

if [[ ! -f "$COMPOSE_FILE" ]]; then
  log "Missing compose file: $COMPOSE_FILE"
  exit 1
fi

if [[ ! -f "$OVERRIDE_FILE" ]]; then
  log "Missing Jakub compose override: $OVERRIDE_FILE"
  exit 1
fi

if [[ -f "$ENV_FILE" ]] && ! grep -q '^OPENCLAW_GATEWAY_PORT=18789$' "$ENV_FILE"; then
  log "Normalizing Docker OpenClaw host port to 18789"
  perl -0pi -e 's/^OPENCLAW_GATEWAY_PORT=.*/OPENCLAW_GATEWAY_PORT=18789/m' "$ENV_FILE"
fi

if ! docker info >/dev/null 2>&1; then
  log "Docker unavailable; starting Colima"
  colima start >>"$LOG_DIR/docker-watchdog.log" 2>&1 || true
fi

for _ in {1..30}; do
  if docker info >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

if ! docker info >/dev/null 2>&1; then
  log "Docker still unavailable after waiting"
  exit 1
fi

docker compose \
  -f "$COMPOSE_FILE" \
  -f "$OVERRIDE_FILE" \
  up -d openclaw-gateway >>"$LOG_DIR/docker-watchdog.log" 2>&1

wait_until_ready() {
  for _ in {1..30}; do
    if curl -fsS http://127.0.0.1:18789/readyz >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done

  return 1
}

if wait_until_ready; then
  log "Docker OpenClaw ready on 127.0.0.1:18789"
  exit 0
fi

log "Docker OpenClaw not ready; restarting gateway"
docker compose \
  -f "$COMPOSE_FILE" \
  -f "$OVERRIDE_FILE" \
  restart openclaw-gateway >>"$LOG_DIR/docker-watchdog.log" 2>&1 || true

if wait_until_ready; then
  log "Docker OpenClaw ready on 127.0.0.1:18789 after restart"
  exit 0
fi

log "Docker OpenClaw did not become ready after restart"
docker compose -f "$COMPOSE_FILE" -f "$OVERRIDE_FILE" ps >>"$LOG_DIR/docker-watchdog.log" 2>&1 || true
exit 1
