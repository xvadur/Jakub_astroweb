#!/usr/bin/env zsh
set -euo pipefail

SOURCE_DIR="${JAKUB_AGENT_DOCS_SOURCE:-/Users/xvadur_mac/Jakub_Astro/ops/openclaw/jakub-agent}"
TARGET_DIR="${JAKUB_AGENT_DOCS_TARGET:-/Users/xvadur_mac/OpenClaw/docker/state/openclaw-config/agent-workspaces/jakub-olsa}"

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "Missing source dir: $SOURCE_DIR" >&2
  exit 1
fi

mkdir -p "$TARGET_DIR"
mkdir -p "$TARGET_DIR/property-drafts" "$TARGET_DIR/approval-queue" "$TARGET_DIR/media-inbox" "$TARGET_DIR/web-patches" "$TARGET_DIR/admin-cases"

for file in USER.md IDENTITY.md AGENTS.md TOOLS.md WORKFLOWS.md LISTINGS.md CRM.md HEARTBEAT.md; do
  install -m 644 "$SOURCE_DIR/$file" "$TARGET_DIR/$file"
done

echo "Synced Jakub agent runtime docs to $TARGET_DIR"
