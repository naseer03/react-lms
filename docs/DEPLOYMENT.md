# LMS Platform — Production Deployment Guide
## Ubuntu 24.04 VPS

---

## Table of Contents

1. [Server Requirements](#1-server-requirements)
2. [VPS Initial Setup](#2-vps-initial-setup)
3. [Install Dependencies](#3-install-dependencies)
4. [MongoDB Setup](#4-mongodb-setup)
5. [Deploy Application](#5-deploy-application)
6. [Nginx Configuration](#6-nginx-configuration)
7. [SSL with Let's Encrypt](#7-ssl-with-lets-encrypt)
8. [PM2 Process Manager](#8-pm2-process-manager)
9. [Docker Sandbox Setup](#9-docker-sandbox-setup)
10. [Google Drive Backup](#10-google-drive-backup)
11. [Firewall Setup](#11-firewall-setup)
12. [Monitoring & Logs](#12-monitoring--logs)
13. [Update & Rollback](#13-update--rollback)
14. [Troubleshooting](#14-troubleshooting)

---

## 1. Server Requirements

| Resource | Minimum | Recommended |
|---|---|---|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 8 GB |
| Disk | 50 GB SSD | 200 GB SSD |
| OS | Ubuntu 24.04 LTS | Ubuntu 24.04 LTS |
| Bandwidth | 100 Mbps | 1 Gbps |

---

## 2. VPS Initial Setup

```bash
# Connect as root
ssh root@your_server_ip

# Update system
apt update && apt upgrade -y

# Set timezone
timedatectl set-timezone Asia/Kolkata

# Create non-root user
adduser lmsapp
usermod -aG sudo lmsapp

# Switch to app user
su - lmsapp
```

---

## 3. Install Dependencies

### Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version   # v20.x.x
npm --version    # 10.x.x
```

### PM2

```bash
sudo npm install -g pm2
pm2 --version
```

### Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### FFmpeg

```bash
sudo apt install -y ffmpeg
ffmpeg -version
ffprobe -version
```

### Docker (for code sandbox)

```bash
sudo apt install -y docker.io
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker lmsapp
# Re-login for group changes to take effect
```

---

## 4. MongoDB Setup

### Option A — Local MongoDB

```bash
# Import MongoDB GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Add repository
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] \
  https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt update
sudo apt install -y mongodb-org

sudo systemctl enable mongod
sudo systemctl start mongod
mongosh --eval "db.runCommand({ping:1})"
```

### Option B — MongoDB Atlas (Cloud)

Use connection string in `.env`:
```
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/lms_db?retryWrites=true&w=majority
```

---

## 5. Deploy Application

```bash
# Create app directory
sudo mkdir -p /var/www/lms
sudo chown -R lmsapp:lmsapp /var/www/lms

# Clone repository
cd /var/www/lms
git clone https://github.com/yourusername/react-lms.git .

# Backend setup
cd /var/www/lms/backend
cp .env.example .env
nano .env          # Fill in all values

npm ci --only=production

# Create necessary directories
mkdir -p uploads/{videos/{raw,hls,thumbnails},pdfs,images,certificates,cert-assets,answers}
mkdir -p logs backups tmp/sandbox

# Seed initial data
node src/utils/seed.js

# Frontend build
cd /var/www/lms/frontend
npm ci
npm run build
```

---

## 6. Nginx Configuration

```bash
# Copy config
sudo cp /var/www/lms/nginx/lms.conf /etc/nginx/sites-available/lms

# Edit with your domain
sudo nano /etc/nginx/sites-available/lms
# Replace: yourdomain.com → your actual domain

# Enable site
sudo ln -s /etc/nginx/sites-available/lms /etc/nginx/sites-enabled/lms
sudo rm -f /etc/nginx/sites-enabled/default

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

---

## 7. SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate (replace with your domain and email)
sudo certbot --nginx \
  -d yourdomain.com \
  -d www.yourdomain.com \
  --email admin@yourdomain.com \
  --agree-tos \
  --non-interactive \
  --redirect

# Verify auto-renewal
sudo certbot renew --dry-run

# Check renewal timer
systemctl status certbot.timer
```

---

## 8. PM2 Process Manager

```bash
cd /var/www/lms/backend

# Start application
pm2 start ecosystem.config.js

# Save process list
pm2 save

# Set up auto-start on reboot
pm2 startup systemd -u lmsapp --hp /home/lmsapp
# Run the command it outputs (starts with sudo env...)

# Useful PM2 commands
pm2 status              # View all processes
pm2 logs lms-backend    # View logs
pm2 restart lms-backend # Restart
pm2 reload lms-backend  # Zero-downtime reload
pm2 monit               # Real-time monitoring
```

### PM2 Log Rotation

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

---

## 9. Docker Sandbox Setup

Pull Docker images for code execution:

```bash
docker pull node:20-alpine      # JavaScript
docker pull python:3.11-alpine  # Python
docker pull openjdk:17-alpine   # Java
docker pull gcc:12               # C / C++

# Verify
docker images
```

Test sandbox:
```bash
docker run --rm --network none node:20-alpine node -e "console.log('sandbox ok')"
```

---

## 10. Google Drive Backup

### Step 1 — Create OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project: **LMS-Backup**
3. Enable **Google Drive API**
4. Create **OAuth 2.0 Client ID** (Desktop app type)
5. Download credentials JSON

### Step 2 — Get Refresh Token

```bash
# Install google-auth-library locally
npm install googleapis google-auth-library

# Run this script (once)
node -e "
const { google } = require('googleapis');
const oauth2Client = new google.auth.OAuth2(
  'YOUR_CLIENT_ID',
  'YOUR_CLIENT_SECRET',
  'urn:ietf:wg:oauth:2.0:oob'
);
const url = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/drive.file']
});
console.log('Open this URL:', url);
"

# Visit the URL, authorize, get code, then:
node -e "
const { google } = require('googleapis');
const oauth2Client = new google.auth.OAuth2('CLIENT_ID', 'SECRET', 'urn:ietf:wg:oauth:2.0:oob');
oauth2Client.getToken('PASTE_CODE_HERE').then(({tokens}) => {
  console.log('Refresh token:', tokens.refresh_token);
});
"
```

### Step 3 — Create Drive Folder

1. Create a folder in Google Drive named **LMS-Backups**
2. Get folder ID from URL: `drive.google.com/drive/folders/FOLDER_ID`

### Step 4 — Update `.env`

```bash
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REFRESH_TOKEN=your_refresh_token
GOOGLE_DRIVE_FOLDER_ID=your_folder_id
ENABLE_CRON=true
```

### Step 5 — Test Backup

```bash
# Trigger manual backup via API
curl -X POST https://yourdomain.com/api/backups/database \
  -H "Cookie: accessToken=YOUR_ADMIN_TOKEN"
```

---

## 11. Firewall Setup

```bash
sudo ufw enable
sudo ufw allow ssh          # Port 22
sudo ufw allow 80/tcp       # HTTP
sudo ufw allow 443/tcp      # HTTPS
sudo ufw deny 5000          # Block direct backend access
sudo ufw deny 27017         # Block direct MongoDB access
sudo ufw status
```

---

## 12. Monitoring & Logs

```bash
# Application logs
pm2 logs lms-backend --lines 100
tail -f /var/www/lms/backend/logs/combined.log
tail -f /var/www/lms/backend/logs/error.log

# Nginx logs
sudo tail -f /var/log/nginx/lms_access.log
sudo tail -f /var/log/nginx/lms_error.log

# System resources
pm2 monit
htop
df -h
free -h

# MongoDB
mongosh lms_db --eval "db.stats()"
```

---

## 13. Update & Rollback

### Deploy Update

```bash
cd /var/www/lms
bash scripts/deploy.sh
```

### Rollback

```bash
cd /var/www/lms
git log --oneline -10      # Find previous commit
git checkout <commit-hash> # Rollback to that commit
bash scripts/deploy.sh --skip-frontend  # Restart backend
```

---

## 14. Troubleshooting

### Backend not starting
```bash
pm2 logs lms-backend --err    # Check error logs
cd /var/www/lms/backend
node src/server.js             # Run directly to see errors
```

### MongoDB connection failed
```bash
sudo systemctl status mongod
sudo journalctl -u mongod -n 50
# Check MONGO_URI in .env
```

### FFmpeg not found
```bash
which ffmpeg
# If missing: sudo apt install -y ffmpeg
```

### Docker permission denied
```bash
sudo usermod -aG docker lmsapp
# Log out and back in
docker ps   # Should work without sudo
```

### SSL certificate issues
```bash
sudo certbot certificates
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

### 502 Bad Gateway
```bash
pm2 status                  # Is backend running?
pm2 restart lms-backend
sudo tail -f /var/log/nginx/lms_error.log
```

### Large video upload timeout
In nginx.conf:
```nginx
proxy_read_timeout 300s;
client_max_body_size 2048M;
```

---

## Quick Reference

| Task | Command |
|---|---|
| Restart backend | `pm2 restart lms-backend` |
| View backend logs | `pm2 logs lms-backend` |
| Reload Nginx | `sudo systemctl reload nginx` |
| Renew SSL | `sudo certbot renew` |
| Manual DB backup | `curl -X POST /api/backups/database` |
| Check disk space | `df -h` |
| MongoDB shell | `mongosh lms_db` |
| Check services | `systemctl status nginx mongod docker` |
