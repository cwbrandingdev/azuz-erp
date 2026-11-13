#!/usr/bin/env bash
# Expose local WAHA through a Cloudflare quick tunnel and push the new URL to Fly.
# Quick-tunnel hostnames change every time this process starts (reboot, crash, reload).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
URL_FILE="${WAHA_TUNNEL_URL_FILE:-$REPO_ROOT/.waha-tunnel-url}"
LOG_FILE="${WAHA_TUNNEL_LOG_FILE:-/tmp/atria-waha-tunnel.log}"

# systemd starts this unit as root with a minimal PATH. The binaries live in the
# desktop user's home.
repo_owner="$(stat -c '%U' "$REPO_ROOT" 2>/dev/null || true)"
repo_home=""
if [[ -n "$repo_owner" ]]; then
  repo_home="$(getent passwd "$repo_owner" | cut -d: -f6 || true)"
fi
if [[ -n "$repo_home" ]]; then
  export PATH="${repo_home}/.local/bin:${repo_home}/.fly/bin:${PATH}"
fi

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared not found" >&2
  exit 1
fi

: >"$LOG_FILE"

(
  url=""
  for _ in $(seq 1 90); do
    if [[ -f "$LOG_FILE" ]]; then
      url="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG_FILE" | tail -1 || true)"
      if [[ -n "$url" ]]; then
        printf '%s\n' "$url" >"$URL_FILE"
        if [[ "$(id -u)" -eq 0 && -n "$repo_owner" && "$repo_owner" != "root" ]]; then
          chown "$repo_owner" "$URL_FILE" || true
        fi
        break
      fi
    fi
    sleep 1
  done

  if [[ -z "$url" ]]; then
    echo "Timed out waiting for the Cloudflare tunnel URL" >&2
    exit 0
  fi

  echo "Tunnel URL is $url — updating Fly" >&2
  # WAHA and DNS can lag behind boot. Keep retrying without stopping cloudflared.
  for _ in $(seq 1 36); do
    if "$SCRIPT_DIR/sync-fly-waha-tunnel.sh"; then
      exit 0
    fi
    sleep 10
  done
  echo "Could not push $url to Fly" >&2
) &

# Line-buffer so the URL is visible in the log before cloudflared's stdout block-buffers.
stdbuf -oL -eL cloudflared tunnel --url http://127.0.0.1:3010 2>&1 | tee -a "$LOG_FILE"
