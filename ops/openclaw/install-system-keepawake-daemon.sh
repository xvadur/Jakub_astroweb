#!/usr/bin/env zsh
set -euo pipefail

LABEL="ai.openclaw.keepawake.system"
SOURCE_PLIST="/Users/xvadur_mac/Jakub_Astro/ops/openclaw/launchd/${LABEL}.plist"
TARGET_PLIST="/Library/LaunchDaemons/${LABEL}.plist"
LOG_DIR="/Library/Logs/openclaw"

if [[ "${EUID}" -ne 0 ]]; then
  exec sudo "$0" "$@"
fi

if [[ ! -f "$SOURCE_PLIST" ]]; then
  echo "Missing source plist: $SOURCE_PLIST" >&2
  exit 1
fi

plutil -lint "$SOURCE_PLIST" >/dev/null
install -d -m 755 -o root -g wheel "$LOG_DIR"
install -m 644 -o root -g wheel "$SOURCE_PLIST" "$TARGET_PLIST"

launchctl bootout system "$TARGET_PLIST" >/dev/null 2>&1 || true
launchctl bootstrap system "$TARGET_PLIST"
launchctl enable "system/${LABEL}" >/dev/null 2>&1 || true
launchctl kickstart -k "system/${LABEL}"

launchctl print "system/${LABEL}" | sed -n '1,90p'
pmset -g assertions | sed -n '1,90p'
