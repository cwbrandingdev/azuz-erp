#!/usr/bin/env bash
# Push the current WAHA tunnel URL into Fly secrets (production backend → home WAHA).
set -euo pipefail

FLY_APP="${FLY_APP:-atria-backend-broken-night-9242}"
FLY_WEBHOOK_URL="${FLY_WEBHOOK_URL:-https://atria-backend-broken-night-9242.fly.dev/whatsapp-webhook}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
URL_FILE="${WAHA_TUNNEL_URL_FILE:-$REPO_ROOT/.waha-tunnel-url}"
LOG_FILE="${WAHA_TUNNEL_LOG_FILE:-/tmp/atria-waha-tunnel.log}"

read_url() {
  if [[ -f "$URL_FILE" ]]; then
    tr -d '[:space:]' <"$URL_FILE"
    return
  fi
  if [[ -f "$LOG_FILE" ]]; then
    grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG_FILE" | tail -1
    return
  fi
  echo ""
}

WAHA_URL="$(read_url)"
if [[ -z "$WAHA_URL" ]]; then
  echo "No tunnel URL in $URL_FILE or $LOG_FILE. Start atria-waha-tunnel.service first." >&2
  exit 1
fi

echo "Testing WAHA via $WAHA_URL ..."
status=$(curl -sS -o /dev/null -w "%{http_code}" -H "X-Api-Key: ${WAHA_API_KEY:-dev-waha-key}" \
  "$WAHA_URL/api/sessions" || echo "000")
if [[ "$status" != "200" ]]; then
  echo "WAHA did not respond with 200 (got $status). Check Docker WAHA on port 3010." >&2
  exit 1
fi

if ! command -v fly >/dev/null 2>&1; then
  echo "fly CLI not found. Set secrets manually:"
  echo "  WAHA_BASE_URL=$WAHA_URL"
  echo "  WAHA_WEBHOOK_URL=$FLY_WEBHOOK_URL"
  exit 0
fi

echo "Updating Fly app $FLY_APP ..."
fly secrets set -a "$FLY_APP" \
  "WAHA_BASE_URL=$WAHA_URL" \
  "WAHA_WEBHOOK_URL=$FLY_WEBHOOK_URL"
echo "Done. Fly will restart machines with the new WAHA URL."
