#!/usr/bin/env zsh
set -euo pipefail

LABEL="ai.openclaw.keepawake"
SOURCE_PLIST="/Users/xvadur_mac/Jakub_Astro/ops/openclaw/launchd/${LABEL}.plist"
TARGET_DIR="/Users/xvadur_mac/Library/LaunchAgents"
TARGET_PLIST="${TARGET_DIR}/${LABEL}.plist"
LOG_DIR="/Users/xvadur_mac/Library/Logs/openclaw"
DOMAIN="gui/$(id -u)"

mkdir -p "$TARGET_DIR" "$LOG_DIR"

if [[ ! -f "$SOURCE_PLIST" ]]; then
  echo "Missing source plist: $SOURCE_PLIST" >&2
  exit 1
fi

plutil -lint "$SOURCE_PLIST" >/dev/null
install -m 644 "$SOURCE_PLIST" "$TARGET_PLIST"

launchctl bootout "$DOMAIN" "$TARGET_PLIST" >/dev/null 2>&1 || true
launchctl bootstrap "$DOMAIN" "$TARGET_PLIST"
launchctl enable "${DOMAIN}/${LABEL}" >/dev/null 2>&1 || true
launchctl kickstart -k "${DOMAIN}/${LABEL}"

launchctl print "${DOMAIN}/${LABEL}" | sed -n '1,90p'
pmset -g assertions | sed -n '1,80p'
