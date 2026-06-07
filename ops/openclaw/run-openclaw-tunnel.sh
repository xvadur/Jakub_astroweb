#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${JAKUB_ASTRO_REPO_DIR:-/Users/xvadur_mac/Jakub_Astro}"
NPX_BIN="${NPX_BIN:-/Users/xvadur_mac/.local/bin/npx}"
TUNNEL_ID="${OPENCLAW_TUNNEL_ID:-350e365a-37f3-436d-8747-6ab0dd6efc8d}"

export PATH="/Users/xvadur_mac/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"

cd "$REPO_DIR"
exec "$NPX_BIN" wrangler tunnel run "$TUNNEL_ID" --config "$REPO_DIR/wrangler.toml" --log-level info
