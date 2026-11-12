#!/usr/bin/env bash
# Smoke test: local WAHA + tunnel + Fly API (WhatsApp bridge).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TUNNEL_FILE="$REPO_ROOT/.waha-tunnel-url"
FLY_APP="${FLY_APP:-atria-backend-broken-night-9242}"
API_KEY="${WAHA_API_KEY:-dev-waha-key}"
FLY_API="${FLY_API:-https://atria-backend-broken-night-9242.fly.dev}"

pass() { printf '✓ %s\n' "$*"; }
fail() { printf '✗ %s\n' "$*"; FAILED=1; }
FAILED=0

echo "=== WAHA Docker ==="
if docker compose -f "$REPO_ROOT/docker-compose.waha.yml" ps --status running 2>/dev/null | grep -q waha; then
  pass "Container running"
else
  fail "WAHA container not running (docker compose -f docker-compose.waha.yml up -d)"
fi

echo "=== Local WAHA API :3010 ==="
if curl -sS -o /dev/null -w "%{http_code}" -H "X-Api-Key: $API_KEY" http://127.0.0.1:3010/api/sessions | grep -q 200; then
  pass "127.0.0.1:3010 responds 200"
else
  fail "Local WAHA not reachable on 3010"
fi

STATUS=$(curl -sS -H "X-Api-Key: $API_KEY" http://127.0.0.1:3010/api/sessions/default)
WAHA_ST=$(echo "$STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','?'))" 2>/dev/null || echo "?")
WEBHOOK=$(echo "$STATUS" | python3 -c "import sys,json; d=json.load(sys.stdin); print((d.get('config') or {}).get('webhooks',[{}])[0].get('url','?'))" 2>/dev/null || echo "?")
if [[ "$WAHA_ST" == "WORKING" ]]; then pass "Session WORKING"; else fail "Session status: $WAHA_ST"; fi
echo "    Webhook on WAHA: $WEBHOOK"
if [[ "$WEBHOOK" == *"fly.dev"* ]]; then pass "Webhook points to Fly"; else fail "Webhook should be Fly URL for production inbox (run fly deploy / stop local backend bootstrap)"; fi

echo "=== Cloudflare tunnel ==="
if [[ -f "$TUNNEL_FILE" ]]; then
  TUNNEL=$(tr -d '[:space:]' <"$TUNNEL_FILE")
  if curl -sS -o /dev/null -w "%{http_code}" -H "X-Api-Key: $API_KEY" "$TUNNEL/api/sessions" | grep -q 200; then
    pass "Tunnel $TUNNEL → 200"
  else
    fail "Tunnel down or URL stale — restart cloudflared and run sync-fly-waha-tunnel.sh"
  fi
else
  fail "Missing $TUNNEL_FILE — start tunnel"
fi

if pgrep -f 'cloudflared.*127.0.0.1:3010' >/dev/null 2>&1; then
  pass "cloudflared process running"
else
  fail "No cloudflared to :3010 (tunnel will die on reboot without systemd)"
fi

echo "=== Fly backend ==="
if curl -sS -o /dev/null -w "%{http_code}" "$FLY_API/health" | grep -q 200; then
  pass "$FLY_API/health 200"
else
  fail "Fly health check failed"
fi

if command -v fly >/dev/null 2>&1; then
  echo "    Fly secrets (names only):"
  fly secrets list -a "$FLY_APP" 2>/dev/null | rg 'WAHA' || true
else
  echo "    (install flyctl to inspect secrets)"
fi

echo "=== WAHA send probe (check-exists + sendText) ==="
PROBE=$(curl -sS -H "X-Api-Key: $API_KEY" "http://127.0.0.1:3010/api/contacts/check-exists?phone=41992534028&session=default")
EXISTS=$(echo "$PROBE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('numberExists',False))" 2>/dev/null)
CHAT=$(echo "$PROBE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('chatId',''))" 2>/dev/null)
if [[ "$EXISTS" == "True" ]]; then
  pass "check-exists for 41992534028"
  SEND=$(curl -sS -w "%{http_code}" -o /tmp/waha-send-probe.json -H "X-Api-Key: $API_KEY" -H "Content-Type: application/json" \
    -d "{\"session\":\"default\",\"chatId\":\"$CHAT\",\"text\":\"bridge-smoke\"}" \
    http://127.0.0.1:3010/api/sendText)
  if [[ "$SEND" == "201" ]]; then pass "sendText via $CHAT → 201"; else fail "sendText → $SEND"; fi
else
  fail "check-exists failed for test number"
fi

echo ""
if [[ "$FAILED" -eq 0 ]]; then
  echo "All checks passed."
  exit 0
fi
echo "Some checks failed."
exit 1
