#!/bin/bash
set -e

echo "=== Ivengo Deploy Script ==="
echo "Target: 173.242.49.73"

# ── 1. System update + Docker ──────────────────────────────────────────
echo "[1/7] Installing Docker..."
apt-get update -qq
apt-get install -y -qq curl git ca-certificates gnupg lsb-release

if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
fi

if ! command -v docker-compose &>/dev/null && ! docker compose version &>/dev/null 2>&1; then
  apt-get install -y -qq docker-compose-plugin
fi

echo "[1/7] Docker OK: $(docker --version)"

# ── 2. Install pnpm + Node (for local prisma migrate) ─────────────────
if ! command -v node &>/dev/null; then
  echo "[2/7] Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi
npm install -g pnpm@9.4.0 -q
echo "[2/7] Node $(node -v) / pnpm $(pnpm -v)"

# ── 3. Project directory ───────────────────────────────────────────────
echo "[3/7] Setting up project..."
mkdir -p /opt/ivengo
cd /opt/ivengo

# ── 4. .env ───────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  echo "[4/7] Creating .env..."
  cat > .env <<'ENVEOF'
DATABASE_URL=postgresql://ivengo:ivengo_secret_2024@localhost:5432/ivengo_db
POSTGRES_PASSWORD=ivengo_secret_2024
REDIS_URL=redis://localhost:6379
JWT_SECRET=REPLACE_WITH_64_CHAR_RANDOM_STRING
ADMIN_PASSWORD=REPLACE_WITH_YOUR_ADMIN_PASSWORD
CORS_ORIGIN=http://munister.com.ua
NEXT_PUBLIC_API_URL=http://173.242.49.73
NEXT_BASE_PATH=/ivengo
ANTHROPIC_API_KEY=REPLACE_WITH_YOUR_ANTHROPIC_KEY
TELEGRAM_BOT_TOKEN=REPLACE_WITH_YOUR_BOT_TOKEN
TELEGRAM_CHANNEL_ID=@your_channel
PORT=3001
WORKER_CRON=* * * * *
MAX_RETRY_COUNT=3
NODE_ENV=production
ENVEOF
  echo "[4/7] .env created — EDIT /opt/ivengo/.env before starting!"
else
  echo "[4/7] .env exists, skipping"
fi

# ── 5. Nginx ───────────────────────────────────────────────────────────
echo "[5/7] Configuring Nginx..."
apt-get install -y -qq nginx

cat > /etc/nginx/sites-available/ivengo <<'NGINXEOF'
server {
    listen 80;
    server_name 173.242.49.73 munister.com.ua;

    location /ivengo {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
    }

    location /_next/static {
        proxy_pass http://127.0.0.1:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 60s;
    }

    location /healthz {
        proxy_pass http://127.0.0.1:3001;
    }

    client_max_body_size 20M;
    gzip on;
    gzip_types text/plain application/json application/javascript text/css;
}
NGINXEOF

ln -sf /etc/nginx/sites-available/ivengo /etc/nginx/sites-enabled/ivengo
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo "[5/7] Nginx OK"

echo ""
echo "=== Deploy base setup complete ==="
echo ""
echo "Next steps:"
echo "  1. Edit /opt/ivengo/.env — fill JWT_SECRET, ADMIN_PASSWORD, ANTHROPIC_API_KEY, TELEGRAM_BOT_TOKEN"
echo "  2. Copy project files: rsync -avz /local/ivengo/ root@173.242.49.73:/opt/ivengo/"
echo "  3. Run: cd /opt/ivengo && docker compose build && docker compose up -d"
echo "  4. Run DB migrations: docker compose exec api npx prisma migrate deploy"
echo "  5. Run seed: docker compose exec api npx prisma db seed"
echo ""
echo "Admin panel: http://173.242.49.73/ivengo"
echo "API health:  http://173.242.49.73/healthz"
