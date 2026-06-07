#!/usr/bin/env bash
set -euo pipefail

LABEL="ai.openclaw.tunnel.jakub"
SOURCE_PLIST="/Users/xvadur_mac/Jakub_Astro/ops/openclaw/launchd/${LABEL}.plist"
TARGET_DIR="/Users/xvadur_mac/Library/LaunchAgents"
TARGET_PLIST="${TARGET_DIR}/${LABEL}.plist"
LOG_DIR="/Users/xvadur_mac/Library/Logs/openclaw"
UID_VALUE="$(id -u)"

mkdir -p "$TARGET_DIR" "$LOG_DIR"
cp "$SOURCE_PLIST" "$TARGET_PLIST"

launchctl bootout "gui/${UID_VALUE}/${LABEL}" >/dev/null 2>&1 || true
launchctl bootstrap "gui/${UID_VALUE}" "$TARGET_PLIST"
launchctl enable "gui/${UID_VALUE}/${LABEL}"
launchctl kickstart -k "gui/${UID_VALUE}/${LABEL}"

echo "Installed and started ${LABEL}"
launchctl print "gui/${UID_VALUE}/${LABEL}" | sed -n '1,80p'
