#!/usr/bin/env bash
# Enable Docker + WAHA to start on boot and survive reboots.
# Optional: ignore laptop lid close so the host does not suspend.
set -euo pipefail

KEEP_AWAKE=false
INSTALL_TUNNEL=false
SERVICE_NAME="atria-waha.service"
TUNNEL_SERVICE="atria-waha-tunnel.service"

usage() {
  cat <<'EOF'
Usage: sudo ./scripts/waha/install-waha-autostart.sh [options]

Options:
  --keep-awake-on-lid-close   Do not suspend when the laptop lid is closed
  --with-cloudflare-tunnel    Start cloudflared to expose WAHA for Fly (quick tunnel)
  -h, --help                  Show this help

After install (production Fly):
  Run as your user (not root): ./scripts/waha/sync-fly-waha-tunnel.sh
  Quick tunnel URLs change when the tunnel restarts — re-run sync after reboot.

After install:
  systemctl status atria-waha
  docker compose -f docker-compose.waha.yml ps
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --keep-awake-on-lid-close) KEEP_AWAKE=true; shift ;;
    --with-cloudflare-tunnel) INSTALL_TUNNEL=true; shift ;;
    -h | --help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
  esac
done

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "Run with sudo so systemd units can be installed." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
UNIT_SRC="$SCRIPT_DIR/atria-waha.service"
UNIT_DEST="/etc/systemd/system/$SERVICE_NAME"

if [[ ! -f "$REPO_ROOT/docker-compose.waha.yml" ]]; then
  echo "Expected docker-compose.waha.yml in $REPO_ROOT" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed or not in PATH." >&2
  exit 1
fi

echo "==> Enabling Docker on boot"
systemctl enable docker.service
systemctl start docker.service

echo "==> Installing $SERVICE_NAME (repo: $REPO_ROOT)"
sed "s|REPO_ROOT|$REPO_ROOT|g" "$UNIT_SRC" >"$UNIT_DEST"

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl start "$SERVICE_NAME"

if [[ "$KEEP_AWAKE" == true ]]; then
  echo "==> Configuring systemd-logind to ignore lid close (no suspend)"
  install -d /etc/systemd/logind.conf.d
  install -m 0644 "$SCRIPT_DIR/logind-no-lid-suspend.conf" \
    /etc/systemd/logind.conf.d/atria-waha-no-lid-suspend.conf
  systemctl restart systemd-logind.service || true
  echo "    Lid-close suspend disabled. You may need to log out/in for all sessions."
fi

if [[ "$INSTALL_TUNNEL" == true ]]; then
  chmod +x "$SCRIPT_DIR/start-waha-tunnel.sh" "$SCRIPT_DIR/sync-fly-waha-tunnel.sh"
  sed "s|REPO_ROOT|$REPO_ROOT|g" "$SCRIPT_DIR/atria-waha-tunnel.service" \
    >"/etc/systemd/system/$TUNNEL_SERVICE"
  systemctl daemon-reload
  systemctl enable "$TUNNEL_SERVICE"
  systemctl start "$TUNNEL_SERVICE" || true
  echo "==> Installed $TUNNEL_SERVICE (cloudflared → :3010)"
  echo "    After the tunnel is up, run: $SCRIPT_DIR/sync-fly-waha-tunnel.sh"
fi

echo ""
echo "WAHA autostart is enabled."
systemctl --no-pager status "$SERVICE_NAME" || true
echo ""
docker compose -f "$REPO_ROOT/docker-compose.waha.yml" ps || true
