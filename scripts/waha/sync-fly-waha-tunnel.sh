#!/usr/bin/env bash
# Push the current WAHA tunnel URL into Fly secrets (production backend → home WAHA).
set -euo pipefail

FLY_APP="${FLY_APP:-atria-backend-broken-night-9242}"
FLY_WEBHOOK_URL="${FLY_WEBHOOK_URL:-https://atria-backend-broken-night-9242.fly.dev/whatsapp-webhook}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
URL_FILE="${WAHA_TUNNEL_URL_FILE:-$REPO_ROOT/.waha-tunnel-url}"
LOG_FILE="${WAHA_TUNNEL_LOG_FILE:-/tmp/atria-waha-tunnel.log}"

# The tunnel unit runs as root. Fly credentials belong to the repo owner.
if [[ "$(id -u)" -eq 0 ]]; then
  repo_owner="$(stat -c '%U' "$REPO_ROOT" 2>/dev/null || true)"
  if [[ -n "$repo_owner" && "$repo_owner" != "root" ]] && command -v runuser >/dev/null 2>&1; then
    exec runuser -u "$repo_owner" -- "$0" "$@"
  fi
fi

export PATH="${HOME}/.fly/bin:${HOME}/.local/bin:${PATH}"

STATE_DIR="${XDG_STATE_HOME:-$HOME/.local/state}"
STATE_FILE="$STATE_DIR/atria-waha-fly-url"
mkdir -p "$STATE_DIR"
exec 9>"$STATE_DIR/atria-waha-fly-sync.lock"
flock 9

read_url() {
  if [[ -f "$URL_FILE" ]]; then
    tr -d '[:space:]' <"$URL_FILE"
    return
  fi
  if [[ -f "$LOG_FILE" ]]; then
    grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG_FILE" | tail -1 || true
    return
  fi
  echo ""
}

WAHA_URL="$(read_url)"
if [[ -z "$WAHA_URL" ]]; then
  echo "No tunnel URL in $URL_FILE or $LOG_FILE. Start atria-waha-tunnel.service first." >&2
  exit 1
fi

if [[ -f "$STATE_FILE" ]] && [[ "$(tr -d '[:space:]' <"$STATE_FILE")" == "$WAHA_URL" ]]; then
  echo "Fly already has $WAHA_URL"
  exit 0
fi

echo "Testing WAHA via $WAHA_URL ..."
status="$(curl -sS -o /dev/null -w "%{http_code}" -H "X-Api-Key: ${WAHA_API_KEY:-dev-waha-key}" \
  "$WAHA_URL/api/sessions" || true)"
if [[ "$status" != "200" ]]; then
  echo "WAHA did not respond with 200 (got $status). Check Docker WAHA on port 3010." >&2
  exit 1
fi

current="$(read_url)"
if [[ "$current" != "$WAHA_URL" ]]; then
  echo "Tunnel URL changed to $current; leaving the Fly update to that run."
  exit 0
fi

if ! command -v fly >/dev/null 2>&1; then
  echo "fly CLI not found. Set secrets manually:" >&2
  echo "  WAHA_BASE_URL=$WAHA_URL" >&2
  echo "  WAHA_WEBHOOK_URL=$FLY_WEBHOOK_URL" >&2
  exit 1
fi

echo "Updating Fly app $FLY_APP ..."
fly secrets set -a "$FLY_APP" --detach \
  "WAHA_BASE_URL=$WAHA_URL" \
  "WAHA_WEBHOOK_URL=$FLY_WEBHOOK_URL"
printf '%s\n' "$WAHA_URL" >"$STATE_FILE"
echo "Done. Fly will restart machines with the new WAHA URL."
