#!/bin/bash
# ─────────────────────────────────────────────────────────────
# LMS Platform — Ubuntu 24.04 VPS Initial Setup Script
# Run as root: bash scripts/setup-vps.sh
# ─────────────────────────────────────────────────────────────
set -e

DOMAIN="${1:-yourdomain.com}"
APP_USER="lmsapp"
APP_DIR="/var/www/lms"

echo "====================================="
echo "  LMS VPS Setup — Ubuntu 24.04"
echo "  Domain: $DOMAIN"
echo "====================================="

# ── System update ──────────────────────────────────────────
echo "[Step 1] Updating system..."
apt-get update -qq && apt-get upgrade -y -qq

# ── Install dependencies ───────────────────────────────────
echo "[Step 2] Installing system packages..."
apt-get install -y -qq \
  curl wget git unzip build-essential \
  nginx certbot python3-certbot-nginx \
  ffmpeg docker.io docker-compose \
  mongodb-org

# Start services
systemctl enable nginx mongod docker
systemctl start nginx mongod docker

# ── Node.js 20 ─────────────────────────────────────────────
echo "[Step 3] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pm2

# ── Create app user ────────────────────────────────────────
echo "[Step 4] Creating app user..."
id -u "$APP_USER" &>/dev/null || useradd -m -s /bin/bash "$APP_USER"
usermod -aG docker "$APP_USER"

# ── App directory ──────────────────────────────────────────
echo "[Step 5] Setting up app directory..."
mkdir -p "$APP_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# ── Nginx config ───────────────────────────────────────────
echo "[Step 6] Configuring Nginx..."
cp nginx/lms.conf /etc/nginx/sites-available/lms
sed -i "s/yourdomain.com/$DOMAIN/g" /etc/nginx/sites-available/lms
ln -sf /etc/nginx/sites-available/lms /etc/nginx/sites-enabled/lms
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ── SSL certificate ────────────────────────────────────────
echo "[Step 7] Obtaining SSL certificate..."
certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" \
  --non-interactive --agree-tos \
  --email "admin@$DOMAIN" \
  --redirect

# ── Firewall ───────────────────────────────────────────────
echo "[Step 8] Configuring firewall..."
ufw --force enable
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp

# ── PM2 startup ────────────────────────────────────────────
echo "[Step 9] Setting up PM2 startup..."
pm2 startup systemd -u "$APP_USER" --hp "/home/$APP_USER"

# ── Pull Docker images for sandbox ────────────────────────
echo "[Step 10] Pulling Docker sandbox images..."
docker pull node:20-alpine
docker pull python:3.11-alpine
docker pull openjdk:17-alpine
docker pull gcc:12

echo ""
echo "✅ VPS setup complete!"
echo ""
echo "Next steps:"
echo "  1. Clone your repo: git clone <repo-url> $APP_DIR"
echo "  2. Copy env: cp $APP_DIR/backend/.env.example $APP_DIR/backend/.env"
echo "  3. Edit .env with your values"
echo "  4. Run: cd $APP_DIR && bash scripts/deploy.sh"
echo "  5. Seed database: cd $APP_DIR/backend && node src/utils/seed.js"
