#!/usr/bin/env bash
set -euo pipefail

SECRET_DIR="${OPENCLAW_CONFIG_SECRET_DIR:-/Users/xvadur_mac/OpenClaw/docker/state/openclaw-config/secrets}"
SECRET_FILE="${OPENCLAW_SUPABASE_SERVICE_KEY_FILE:-$SECRET_DIR/jakub-supabase-service-role-key}"

read_secret() {
  if [ ! -t 0 ]; then
    cat
    return
  fi

  if command -v pbpaste >/dev/null 2>&1; then
    pbpaste
    return
  fi

  printf 'Paste Supabase service role key, then press Ctrl-D:\n' >&2
  cat
}

SECRET_VALUE="$(read_secret | tr -d '\r\n')"

if [ -z "$SECRET_VALUE" ]; then
  echo "No Supabase service role key provided." >&2
  exit 1
fi

mkdir -p "$SECRET_DIR"
umask 077
printf '%s\n' "$SECRET_VALUE" > "$SECRET_FILE"
chmod 600 "$SECRET_FILE"

echo "Supabase service role key saved outside repo:"
echo "$SECRET_FILE"
echo
echo "Use this in OpenClaw runtime env:"
echo "SUPABASE_SERVICE_ROLE_KEY_FILE=$SECRET_FILE"
