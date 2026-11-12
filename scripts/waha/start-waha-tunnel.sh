#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
URL_FILE="${WAHA_TUNNEL_URL_FILE:-$REPO_ROOT/.waha-tunnel-url}"
LOG_FILE="${WAHA_TUNNEL_LOG_FILE:-/tmp/atria-waha-tunnel.log}"

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared not found" >&2
  exit 1
fi

: >"$LOG_FILE"

(
  for _ in $(seq 1 90); do
    if [[ -f "$LOG_FILE" ]]; then
      url=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG_FILE" | tail -1)
      if [[ -n "$url" ]]; then
        printf '%s\n' "$url" >"$URL_FILE"
        exit 0
      fi
    fi
    sleep 1
  done
) &

cloudflared tunnel --url http://127.0.0.1:3010 2>&1 | tee -a "$LOG_FILE"
