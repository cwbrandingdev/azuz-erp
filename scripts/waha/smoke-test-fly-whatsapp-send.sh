#!/usr/bin/env bash
# End-to-end: login to Fly API and POST /whatsapp/send (needs real credentials).
set -euo pipefail

FLY_API="${FLY_API:-https://atria-backend-broken-night-9242.fly.dev}"
EMAIL="${ATRIA_TEST_EMAIL:-}"
PASSWORD="${ATRIA_TEST_PASSWORD:-}"
TO="${WAHA_SEND_PROBE_PHONE:-41992534028}"
TEXT="${WAHA_SEND_PROBE_TEXT:-fly-api-smoke}"

if [[ -z "$EMAIL" || -z "$PASSWORD" ]]; then
  echo "Skip: set ATRIA_TEST_EMAIL and ATRIA_TEST_PASSWORD to run Fly /whatsapp/send probe."
  exit 0
fi

LOGIN=$(curl -sS -X POST "$FLY_API/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken',''))" 2>/dev/null || true)
if [[ -z "$TOKEN" ]]; then
  echo "✗ Login failed (no accessToken)"
  exit 1
fi
echo "✓ Login ok"

HTTP=$(curl -sS -w "%{http_code}" -o /tmp/fly-wa-send.json \
  -X POST "$FLY_API/whatsapp/send" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"to\":\"$TO\",\"message\":\"$TEXT\"}")
if [[ "$HTTP" == "201" || "$HTTP" == "200" ]]; then
  echo "✓ POST /whatsapp/send → $HTTP"
  exit 0
fi
echo "✗ POST /whatsapp/send → $HTTP"
head -c 400 /tmp/fly-wa-send.json 2>/dev/null || true
echo ""
exit 1
