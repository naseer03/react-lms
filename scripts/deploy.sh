#!/bin/bash
# ─────────────────────────────────────────────────────────────
# LMS Platform — Production Deployment Script
# Usage: bash scripts/deploy.sh [--skip-frontend] [--skip-backend]
# ─────────────────────────────────────────────────────────────
set -e

APP_DIR="/var/www/lms"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
BRANCH="${DEPLOY_BRANCH:-main}"

SKIP_FRONTEND=false
SKIP_BACKEND=false

for arg in "$@"; do
  case $arg in
    --skip-frontend) SKIP_FRONTEND=true ;;
    --skip-backend)  SKIP_BACKEND=true  ;;
  esac
done

echo "====================================="
echo "  LMS Platform Deployment"
echo "  Branch: $BRANCH"
echo "====================================="

# ── Pull latest code ───────────────────────────────────────
echo "[1/6] Pulling latest code..."
cd "$APP_DIR"
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

# ── Backend ────────────────────────────────────────────────
if [ "$SKIP_BACKEND" = false ]; then
  echo "[2/6] Installing backend dependencies..."
  cd "$BACKEND_DIR"
  npm ci --only=production

  echo "[3/6] Restarting backend (PM2)..."
  pm2 reload ecosystem.config.js --update-env || pm2 start ecosystem.config.js
  pm2 save
else
  echo "[2-3/6] Skipping backend..."
fi

# ── Frontend ───────────────────────────────────────────────
if [ "$SKIP_FRONTEND" = false ]; then
  echo "[4/6] Building frontend..."
  cd "$FRONTEND_DIR"
  npm ci
  npm run build

  echo "[5/6] Frontend build complete."
else
  echo "[4-5/6] Skipping frontend..."
fi

# ── Nginx reload ───────────────────────────────────────────
echo "[6/6] Reloading Nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "✅ Deployment complete!"
echo "   Backend:  pm2 status"
echo "   Logs:     pm2 logs lms-backend"
echo "   Nginx:    sudo tail -f /var/log/nginx/lms_error.log"
