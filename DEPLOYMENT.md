# Deployment Guide

Complete production deployment guide for the Kalshi Weather Trading Dashboard. Covers systemd services, Nginx reverse proxy, SSL configuration, Docker deployment, and monitoring setup.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Server Requirements](#server-requirements)
- [Production Architecture](#production-architecture)
- [Deployment Options](#deployment-options)
  - [Option 1: Systemd + Nginx (Recommended)](#option-1-systemd--nginx-recommended)
  - [Option 2: Docker Compose](#option-2-docker-compose)
  - [Option 3: Cloud Platform (Heroku, Render)](#option-3-cloud-platform-heroku-render)
- [SSL/TLS Setup](#ssltls-setup)
- [Environment Configuration](#environment-configuration)
- [Database Setup (Optional)](#database-setup-optional)
- [Monitoring & Logging](#monitoring--logging)
- [Backup & Recovery](#backup--recovery)
- [Performance Optimization](#performance-optimization)
- [Security Hardening](#security-hardening)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying to production:

- **Server**: Linux VPS or bare metal with 1GB+ RAM, 10GB+ disk
- **OS**: Ubuntu 22.04 LTS, Debian 11+, or RHEL 8+ (guide uses Ubuntu)
- **Domain**: Registered domain pointing to your server IP (e.g., `dashboard.example.com`)
- **SSL Certificate**: Let's Encrypt recommended (free)
- **Trading Daemon**: Must be running on the same server or accessible via network path

---

## Server Requirements

### Minimum Specifications
- **CPU**: 1 core (2+ recommended for WebSocket handling)
- **RAM**: 1GB (2GB recommended)
- **Disk**: 10GB (includes OS, logs, and file storage)
- **Network**: 100Mbps+ (WebSocket streaming benefits from low latency)

### Software Requirements
- **Python**: 3.10+ (3.11 or 3.12 recommended)
- **Node.js**: 18+ (20 LTS recommended for frontend build)
- **Nginx**: 1.18+ (for reverse proxy)
- **Systemd**: For service management (standard on Ubuntu 22.04)
- **Certbot**: For Let's Encrypt SSL certificates (optional but recommended)

### Port Requirements
- **80** (HTTP): Redirects to HTTPS
- **443** (HTTPS): Main dashboard access
- **8000** (Internal): Daphne ASGI server (not exposed)

---

## Production Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                           Internet                               │
└──────────────────────┬───────────────────────────────────────────┘
                       │ HTTPS (443)
                       │
┌──────────────────────▼───────────────────────────────────────────┐
│                    Nginx Reverse Proxy                           │
│  • SSL termination (Let's Encrypt)                               │
│  • Static file serving (frontend build)                          │
│  • API/WebSocket proxy to Daphne                                 │
│  • Gzip compression                                              │
│  • Rate limiting (optional)                                      │
└──────────────────────┬───────────────────────────────────────────┘
                       │ HTTP (localhost:8000)
                       │
┌──────────────────────▼───────────────────────────────────────────┐
│                  Daphne ASGI Server (systemd)                    │
│  • Django application (REST API)                                 │
│  • WebSocket handler (log streaming)                             │
│  • File reader layer                                             │
└──────────────────────┬───────────────────────────────────────────┘
                       │ File I/O
                       │
┌──────────────────────▼───────────────────────────────────────────┐
│                    Data Files (TRADING_DIR)                      │
│  • kalshi_unified_state.json                                     │
│  • kalshi_backtest_log.jsonl                                     │
│  • kalshi_settlement_log.jsonl                                   │
│  • kalshi_pnl.json                                               │
│  • kalshi_unified_log.txt                                        │
│  • paper_trades.jsonl                                            │
└──────────────────────────────────────────────────────────────────┘
```

---

## Deployment Options

### Option 1: Systemd + Nginx (Recommended)

Best for VPS deployments (DigitalOcean, Linode, AWS EC2, Hetzner).

#### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y python3.11 python3.11-venv python3-pip nginx git

# Create application user
sudo useradd -r -s /bin/bash -m -d /opt/kalshi kalshi
```

#### Step 2: Deploy Application

```bash
# Clone repository
sudo -u kalshi git clone https://github.com/Tyler-Irving/kalshi-dashboard.git /opt/kalshi/dashboard
cd /opt/kalshi/dashboard

# Backend setup
cd backend
sudo -u kalshi python3.11 -m venv venv
sudo -u kalshi venv/bin/pip install --upgrade pip
sudo -u kalshi venv/bin/pip install -r requirements.txt

# Create production .env
sudo -u kalshi cp .env.example .env
sudo -u kalshi nano .env
```

**Production .env Configuration:**
```bash
# Django settings
SECRET_KEY=<generate-with-manage.py-generate-secret-key>
DEBUG=false
ALLOWED_HOSTS=dashboard.example.com,localhost
CORS_ALLOWED_ORIGINS=https://dashboard.example.com

# Data source
TRADING_DIR=/home/trading/kalshi-weather-bot
KALSHI_DAEMON_DIR=/home/trading/kalshi-weather-bot

# Optional: Secrets directory
KALSHI_SECRETS_DIR=/home/trading/.secrets

# Logging
LOG_LEVEL=INFO
```

**Generate SECRET_KEY:**
```bash
cd /opt/kalshi/dashboard/backend
sudo -u kalshi venv/bin/python manage.py generate_secret_key
# Copy output to .env SECRET_KEY=...
```

#### Step 3: Create Systemd Service

Create `/etc/systemd/system/kalshi-dashboard.service`:

```ini
[Unit]
Description=Kalshi Weather Trading Dashboard (Daphne ASGI Server)
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=kalshi
Group=kalshi
WorkingDirectory=/opt/kalshi/dashboard/backend
Environment="PATH=/opt/kalshi/dashboard/backend/venv/bin"
Environment="PYTHONUNBUFFERED=1"
ExecStart=/opt/kalshi/dashboard/backend/venv/bin/daphne \
    -b 127.0.0.1 \
    -p 8000 \
    --proxy-headers \
    config.asgi:application

# Restart policy
Restart=always
RestartSec=10
StartLimitInterval=200
StartLimitBurst=5

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/kalshi/dashboard/backend

# Resource limits
LimitNOFILE=4096
MemoryLimit=512M

[Install]
WantedBy=multi-user.target
```

**Enable and start service:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable kalshi-dashboard
sudo systemctl start kalshi-dashboard
sudo systemctl status kalshi-dashboard
```

**View logs:**
```bash
sudo journalctl -u kalshi-dashboard -f
```

#### Step 4: Build Frontend

```bash
cd /opt/kalshi/dashboard/frontend

# Install dependencies
sudo -u kalshi npm ci --production

# Build production bundle
sudo -u kalshi VITE_API_URL=https://dashboard.example.com npm run build

# Verify build output
ls -la dist/
# Should contain: index.html, assets/
```

#### Step 5: Configure Nginx

Create `/etc/nginx/sites-available/kalshi-dashboard`:

```nginx
# Upstream backend server
upstream dashboard_backend {
    server 127.0.0.1:8000;
    keepalive 16;
}

# HTTP → HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name dashboard.example.com;
    
    # ACME challenge for Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name dashboard.example.com;
    
    # SSL configuration (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/dashboard.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dashboard.example.com/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/dashboard.example.com/chain.pem;
    
    # SSL best practices
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # Logging
    access_log /var/log/nginx/kalshi-dashboard-access.log;
    error_log /var/log/nginx/kalshi-dashboard-error.log warn;
    
    # Max body size (for future file upload features)
    client_max_body_size 10M;
    
    # API proxy
    location /api/ {
        proxy_pass http://dashboard_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # HTTP/1.1 for keepalive
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
    
    # WebSocket proxy
    location /ws/ {
        proxy_pass http://dashboard_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Long timeout for persistent connections
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        
        # Disable buffering
        proxy_buffering off;
    }
    
    # Frontend static files
    location / {
        root /opt/kalshi/dashboard/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets (hashed filenames in /assets/)
        location ~* ^/assets/.*\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        # Never cache index.html
        location = /index.html {
            add_header Cache-Control "no-store, no-cache, must-revalidate";
        }
    }
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;
    gzip_min_length 256;
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/kalshi-dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Step 6: SSL Setup (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot certonly --nginx -d dashboard.example.com

# Test auto-renewal
sudo certbot renew --dry-run
```

Certbot will automatically set up a cron job for certificate renewal.

#### Step 7: Verify Deployment

```bash
# Check service status
sudo systemctl status kalshi-dashboard

# Test backend
curl http://localhost:8000/api/v1/health/

# Test external access
curl https://dashboard.example.com/api/v1/health/

# Check logs
sudo journalctl -u kalshi-dashboard -n 50
sudo tail -f /var/log/nginx/kalshi-dashboard-access.log
```

---

### Option 2: Docker Compose

Best for containerized deployments with Docker/Podman.

#### Project Structure

```
kalshi-dashboard/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   └── ...
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── ...
└── nginx/
    └── nginx.conf (reverse proxy)
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: kalshi-dashboard-backend
    restart: unless-stopped
    environment:
      - SECRET_KEY=${SECRET_KEY}
      - DEBUG=false
      - ALLOWED_HOSTS=${DOMAIN}
      - CORS_ALLOWED_ORIGINS=https://${DOMAIN}
      - TRADING_DIR=/data
    volumes:
      - ./backend/.env:/app/.env:ro
      - /path/to/trading/data:/data:ro
    expose:
      - "8000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/health/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - dashboard

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        - VITE_API_URL=https://${DOMAIN}
    container_name: kalshi-dashboard-frontend
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - backend
    networks:
      - dashboard

networks:
  dashboard:
    driver: bridge
```

#### backend/Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Create non-root user
RUN useradd -r -s /bin/false kalshi && \
    chown -R kalshi:kalshi /app

USER kalshi

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health/ || exit 1

# Run Daphne
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "config.asgi:application"]
```

#### frontend/Dockerfile

```dockerfile
# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --production=false

# Copy source and build
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy build output
COPY --from=build /app/dist /usr/share/nginx/html

# Copy Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
```

#### frontend/nginx.conf

```nginx
upstream backend {
    server backend:8000;
}

server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name _;

    ssl_certificate /etc/letsencrypt/live/dashboard.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dashboard.example.com/privkey.pem;

    root /usr/share/nginx/html;
    index index.html;

    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /health {
        access_log off;
        return 200 "OK";
    }
}
```

#### Deploy with Docker Compose

```bash
# Create .env file
cat > .env <<EOF
SECRET_KEY=$(python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')
DOMAIN=dashboard.example.com
EOF

# Build and start
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

---

### Option 3: Cloud Platform (Heroku, Render)

Best for quick deployments without server management.

#### Render.com Deployment

**1. Create `render.yaml`:**

```yaml
services:
  - type: web
    name: kalshi-dashboard-backend
    env: python
    buildCommand: pip install -r backend/requirements.txt
    startCommand: daphne -b 0.0.0.0 -p $PORT config.asgi:application
    envVars:
      - key: PYTHON_VERSION
        value: 3.11.0
      - key: SECRET_KEY
        generateValue: true
      - key: DEBUG
        value: false
      - key: ALLOWED_HOSTS
        sync: false
      - key: CORS_ALLOWED_ORIGINS
        sync: false
      - key: TRADING_DIR
        value: /data
    disk:
      name: trading-data
      mountPath: /data
      sizeGB: 10

  - type: web
    name: kalshi-dashboard-frontend
    env: static
    buildCommand: cd frontend && npm ci && npm run build
    staticPublishPath: ./frontend/dist
    routes:
      - type: rewrite
        source: /api/*
        destination: https://kalshi-dashboard-backend.onrender.com/api/*
      - type: rewrite
        source: /ws/*
        destination: wss://kalshi-dashboard-backend.onrender.com/ws/*
```

**2. Deploy:**
- Connect GitHub repository to Render
- Push code to main branch
- Render automatically deploys

---

## SSL/TLS Setup

### Let's Encrypt (Free)

**Using Certbot:**
```bash
# Install
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d dashboard.example.com

# Auto-renewal is configured by default
sudo systemctl status certbot.timer
```

**Manual renewal:**
```bash
sudo certbot renew
```

### Custom SSL Certificate

If using a purchased certificate:

```nginx
server {
    listen 443 ssl http2;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    ssl_trusted_certificate /path/to/ca-bundle.crt;
    
    # ... rest of config
}
```

---

## Environment Configuration

### Production Settings Checklist

- [ ] `SECRET_KEY` — Strong random key (64+ characters)
- [ ] `DEBUG=false` — **Never** enable DEBUG in production
- [ ] `ALLOWED_HOSTS` — Set to your domain
- [ ] `CORS_ALLOWED_ORIGINS` — Restrict to your frontend domain
- [ ] `TRADING_DIR` — Correct path to daemon files
- [ ] `LOG_LEVEL=INFO` — Reduce log verbosity
- [ ] File permissions — Ensure `kalshi` user can read `TRADING_DIR`

### File Permissions

```bash
# Allow dashboard to read daemon files
sudo chmod 755 /home/trading/kalshi-weather-bot
sudo chmod 644 /home/trading/kalshi-weather-bot/*.json
sudo chmod 644 /home/trading/kalshi-weather-bot/*.jsonl
sudo chmod 644 /home/trading/kalshi-weather-bot/*.txt

# If using secrets directory
sudo chmod 700 /home/trading/.secrets
sudo chmod 600 /home/trading/.secrets/*
```

---

## Database Setup (Optional)

Currently, the dashboard is **file-based** (no database required). For future enhancements (caching, user accounts), PostgreSQL is recommended.

### PostgreSQL Installation

```bash
sudo apt install postgresql postgresql-contrib
sudo -u postgres createuser kalshi
sudo -u postgres createdb kalshi_dashboard -O kalshi
```

### Django Configuration

Add to `backend/.env`:
```bash
DATABASE_URL=postgresql://kalshi:password@localhost:5432/kalshi_dashboard
```

Update `backend/config/settings.py`:
```python
import dj_database_url

DATABASES = {
    'default': dj_database_url.config(
        default='sqlite:///db.sqlite3',
        conn_max_age=600
    )
}
```

Run migrations:
```bash
python manage.py migrate
```

---

## Monitoring & Logging

### Systemd Journal

View service logs:
```bash
# Last 50 lines
sudo journalctl -u kalshi-dashboard -n 50

# Follow (tail)
sudo journalctl -u kalshi-dashboard -f

# Last 24 hours
sudo journalctl -u kalshi-dashboard --since "24 hours ago"
```

### Nginx Logs

```bash
# Access log
sudo tail -f /var/log/nginx/kalshi-dashboard-access.log

# Error log
sudo tail -f /var/log/nginx/kalshi-dashboard-error.log
```

### Log Rotation

Create `/etc/logrotate.d/kalshi-dashboard`:

```
/var/log/nginx/kalshi-dashboard-*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    missingok
    sharedscripts
    postrotate
        systemctl reload nginx > /dev/null 2>&1 || true
    endscript
}
```

### Health Monitoring

**Uptime monitoring with health endpoint:**
```bash
# Add to cron (every 5 minutes)
*/5 * * * * curl -sf https://dashboard.example.com/api/v1/health/ > /dev/null || echo "Dashboard down"
```

**External monitoring services:**
- [UptimeRobot](https://uptimerobot.com/) (free)
- [Pingdom](https://www.pingdom.com/)
- [StatusCake](https://www.statuscake.com/)

Configure monitor:
- **URL**: `https://dashboard.example.com/api/v1/health/`
- **Interval**: 5 minutes
- **Expected response**: `{"status": "ok"}`

---

## Backup & Recovery

### What to Back Up

1. **Configuration files**:
   - `backend/.env`
   - `/etc/systemd/system/kalshi-dashboard.service`
   - `/etc/nginx/sites-available/kalshi-dashboard`

2. **SSL certificates** (if not using Let's Encrypt auto-renewal):
   - `/etc/letsencrypt/`

3. **Application code** (optional, if you've made local changes):
   - `/opt/kalshi/dashboard/`

4. **Data files** (critical—backup trading daemon output):
   - `$TRADING_DIR/*.json`
   - `$TRADING_DIR/*.jsonl`

### Backup Script

Create `/opt/kalshi/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR=/backups/kalshi-dashboard
DATE=$(date +%Y-%m-%d_%H-%M-%S)

# Create backup directory
mkdir -p $BACKUP_DIR/$DATE

# Backup data files
cp -a /home/trading/kalshi-weather-bot/*.json $BACKUP_DIR/$DATE/
cp -a /home/trading/kalshi-weather-bot/*.jsonl $BACKUP_DIR/$DATE/

# Backup configs
cp /opt/kalshi/dashboard/backend/.env $BACKUP_DIR/$DATE/
cp /etc/nginx/sites-available/kalshi-dashboard $BACKUP_DIR/$DATE/

# Compress
tar -czf $BACKUP_DIR/backup-$DATE.tar.gz -C $BACKUP_DIR $DATE
rm -rf $BACKUP_DIR/$DATE

# Keep only last 7 days
find $BACKUP_DIR -name "backup-*.tar.gz" -mtime +7 -delete

echo "Backup completed: backup-$DATE.tar.gz"
```

**Schedule daily backups:**
```bash
sudo crontab -e
# Add line:
0 3 * * * /opt/kalshi/backup.sh >> /var/log/kalshi-backup.log 2>&1
```

### Recovery

**Restore from backup:**
```bash
cd /backups/kalshi-dashboard
tar -xzf backup-2026-02-16_03-00-00.tar.gz
cp 2026-02-16_03-00-00/.env /opt/kalshi/dashboard/backend/
sudo systemctl restart kalshi-dashboard
```

---

## Performance Optimization

### Backend Optimization

**1. Enable HTTP keepalive:**
Already configured in Nginx (`keepalive 16` in upstream).

**2. Optimize file reading:**
For large JSONL files, implement pagination:
```python
# In dashboard/file_readers.py
def read_jsonl(self, filename, limit=1000, offset=0):
    # Skip first 'offset' lines, read 'limit' lines
    ...
```

**3. Add Redis caching (optional):**
```bash
sudo apt install redis-server
pip install django-redis
```

Configure in `settings.py`:
```python
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}
```

Cache expensive analytics:
```python
from django.core.cache import cache

@api_view(['GET'])
def reliability_summary(request):
    cache_key = 'reliability_summary'
    data = cache.get(cache_key)
    if not data:
        data = compute_reliability()
        cache.set(cache_key, data, 300)  # 5 minutes
    return Response(data)
```

### Frontend Optimization

**1. Enable Brotli compression (Nginx):**
```bash
sudo apt install libnginx-mod-http-brotli-filter libnginx-mod-http-brotli-static
```

Add to Nginx config:
```nginx
brotli on;
brotli_comp_level 6;
brotli_types text/plain text/css application/json application/javascript text/xml application/xml+rss image/svg+xml;
```

**2. Add CDN (optional):**
- CloudFlare (free tier)
- Cloudinary (images)
- jsDelivr (libraries)

**3. Lazy load charts:**
```typescript
// In React components
import { lazy, Suspense } from 'react';

const PnLChart = lazy(() => import('./components/PnLChart'));

<Suspense fallback={<div>Loading chart...</div>}>
  <PnLChart />
</Suspense>
```

### Database Optimization (if using PostgreSQL)

```sql
-- Add indexes for common queries
CREATE INDEX idx_settlement_city ON settlement_log(city);
CREATE INDEX idx_settlement_date ON settlement_log(date);
CREATE INDEX idx_settlement_side ON settlement_log(side);
```

---

## Security Hardening

### Application Security

**1. Update SECRET_KEY regularly:**
```bash
python manage.py generate_secret_key
# Update .env and restart
sudo systemctl restart kalshi-dashboard
```

**2. Restrict file permissions:**
```bash
sudo chmod 600 /opt/kalshi/dashboard/backend/.env
sudo chown kalshi:kalshi /opt/kalshi/dashboard/backend/.env
```

**3. Enable HTTPS-only cookies:**
In `settings.py`:
```python
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = True
```

### Nginx Security

**1. Rate limiting:**
```nginx
# In http block
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

# In server block
location /api/ {
    limit_req zone=api_limit burst=20 nodelay;
    # ... rest of proxy config
}
```

**2. Block common attack vectors:**
```nginx
# Block user agents
if ($http_user_agent ~* (bot|crawler|spider|scraper)) {
    return 403;
}

# Block SQL injection attempts
location ~ (\<|%3C).*script.*(\>|%3E) {
    return 403;
}
```

**3. Enable fail2ban:**
```bash
sudo apt install fail2ban

# Configure in /etc/fail2ban/jail.local
[nginx-http-auth]
enabled = true
```

### Firewall Configuration

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

### Regular Updates

```bash
# System updates
sudo apt update && sudo apt upgrade -y

# Python dependencies
cd /opt/kalshi/dashboard/backend
sudo -u kalshi venv/bin/pip install --upgrade -r requirements.txt

# Restart after updates
sudo systemctl restart kalshi-dashboard
```

---

## Troubleshooting

### Service Won't Start

**Check status:**
```bash
sudo systemctl status kalshi-dashboard
sudo journalctl -u kalshi-dashboard -n 100
```

**Common causes:**
- **Port 8000 in use**: Another process using port (check with `sudo lsof -i :8000`)
- **Invalid .env**: Check SECRET_KEY is set, no syntax errors
- **File permissions**: Ensure `kalshi` user can read `TRADING_DIR`
- **Python errors**: Check logs for import errors or missing dependencies

**Solution:**
```bash
# Kill process on port 8000
sudo lsof -i :8000 | awk 'NR>1 {print $2}' | xargs sudo kill

# Fix permissions
sudo chmod 755 /home/trading/kalshi-weather-bot
sudo chmod 644 /home/trading/kalshi-weather-bot/*

# Restart
sudo systemctl restart kalshi-dashboard
```

### "502 Bad Gateway"

**Cause**: Nginx can't reach backend.

**Check backend is running:**
```bash
curl http://localhost:8000/api/v1/health/
```

**If backend is down:**
```bash
sudo systemctl restart kalshi-dashboard
```

**If backend is up but Nginx can't reach it:**
- Check Nginx error log: `sudo tail -f /var/log/nginx/kalshi-dashboard-error.log`
- Verify upstream in Nginx config: `upstream dashboard_backend { server 127.0.0.1:8000; }`

### "WebSocket Connection Failed"

**Check WebSocket proxy:**
```bash
# Test with wscat
npm install -g wscat
wscat -c wss://dashboard.example.com/ws/logs/
```

**Common issues:**
- **Missing Upgrade headers**: Check Nginx WebSocket config
- **Firewall blocking**: Ensure port 443 is open
- **Daphne not running**: Verify systemd service is active

**Fix Nginx WebSocket config:**
```nginx
location /ws/ {
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    # ... rest of config
}
```

### High CPU/Memory Usage

**Identify process:**
```bash
top
htop
```

**If Daphne is consuming too much memory:**
- Check for memory leaks in logs
- Restart service: `sudo systemctl restart kalshi-dashboard`
- Increase memory limit in systemd service: `MemoryLimit=1G`

**If Nginx is consuming too much CPU:**
- Check for excessive requests (DDoS)
- Enable rate limiting (see Security Hardening)
- Review access logs: `sudo tail -n 1000 /var/log/nginx/kalshi-dashboard-access.log`

### SSL Certificate Issues

**Certificate expired:**
```bash
sudo certbot renew
sudo systemctl reload nginx
```

**Certificate not found:**
```bash
# Verify paths in Nginx config
sudo ls -la /etc/letsencrypt/live/dashboard.example.com/
```

**Mixed content warnings:**
- Ensure all resources loaded over HTTPS
- Check `VITE_API_URL` uses `https://`

---

## Maintenance Tasks

### Weekly
- [ ] Review application logs for errors
- [ ] Check disk usage: `df -h`
- [ ] Verify backups are running

### Monthly
- [ ] Update system packages: `sudo apt update && sudo apt upgrade`
- [ ] Update Python dependencies: `pip list --outdated`
- [ ] Review Nginx access logs for unusual traffic
- [ ] Rotate logs manually if needed: `sudo logrotate -f /etc/logrotate.d/kalshi-dashboard`

### Quarterly
- [ ] Review and update security policies
- [ ] Test backup restoration process
- [ ] Audit user access (if multi-user)
- [ ] Review SSL certificate expiration

---

## Additional Resources

- **Django Deployment Checklist**: https://docs.djangoproject.com/en/4.2/howto/deployment/checklist/
- **Nginx Configuration Guide**: https://nginx.org/en/docs/
- **Let's Encrypt Documentation**: https://letsencrypt.org/docs/
- **Systemd Service Management**: https://www.freedesktop.org/software/systemd/man/systemd.service.html
- **Docker Compose Documentation**: https://docs.docker.com/compose/

---

## Support

For deployment issues:
1. Check this guide's [Troubleshooting](#troubleshooting) section
2. Review application logs (systemd, Nginx)
3. Open an issue on [GitHub](https://github.com/Tyler-Irving/kalshi-dashboard/issues)

For security vulnerabilities, email: [security contact] (do not open public issue)

---

**Production Deployment Complete** ✅

Your Kalshi Weather Trading Dashboard is now live and accessible at `https://dashboard.example.com`.
