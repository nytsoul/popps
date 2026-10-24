# ShopScale — Production Deployment Guide

This guide covers deploying the full ShopScale platform (FastAPI Backend + PostgreSQL + Redis + Celery + React Frontend + Nginx).

---

## Architecture Overview

```
                      Internet
                         │
                 ┌───────▼───────┐
                 │  Nginx (:80)  │  (Serves Single-Page App & Reverse Proxies)
                 └───────┬───────┘
                         │
        ┌────────────────┼────────────────┐
        │ /              │ /api/v1/*      │ /uploads/*
        ▼                ▼                ▼
   [Frontend]       [FastAPI]      [Static Media]
   React SPA        (Uvicorn)
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
    PostgreSQL 16                      Redis 7
 (Relational Store)           (Cache, Sessions & Celery)
                                         ▲
                                         │
                                   Celery Worker
                                (Crawling, Async Tasks)
```

---

## Method 1: One-Command Docker Deployment (Recommended for VPS / AWS EC2 / DigitalOcean)

The repository includes a ready-to-use production Docker Compose stack in [`docker-compose.prod.yml`](file:///d:/Programming/Popss/docker-compose.prod.yml).

### Prerequisites
- A server with Docker and Docker Compose installed.
- Domain name pointed to the server's public IP.

### Deployment Steps
1. Clone the repository onto your server:
   ```bash
   git clone https://github.com/your-org/shopscale.git
   cd shopscale
   ```

2. Review or customize environment variables:
   Create or edit `backend/.env`:
   ```bash
   APP_ENV=production
   DEBUG=false
   APP_SECRET_KEY=generate-a-strong-random-key-with-openssl
   ALLOWED_ORIGINS=["https://yourdomain.com"]
   ```

3. Launch the complete stack:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```

4. Verify services:
   ```bash
   docker compose -f docker-compose.prod.yml ps
   ```

5. View logs:
   ```bash
   docker compose -f docker-compose.prod.yml logs -f api
   ```

---

## Method 2: Cloud Services (PaaS)

### Backend on Render / Railway / Fly.io

1. **Database & Redis**:
   - Provision a managed **PostgreSQL** database and **Redis** instance on your provider.
2. **Web Service**:
   - Root directory: `backend/`
   - Build command: `pip install -r requirements.txt`
   - Start command: `alembic upgrade head && python -m app.db.seed && uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 4`
   - Environment variables:
     - `DATABASE_URL`: Your PostgreSQL connection string
     - `REDIS_URL`: Your Redis connection string
     - `APP_ENV`: `production`
     - `DEBUG`: `false`
     - `APP_SECRET_KEY`: Random 64-character secret
     - `ALLOWED_ORIGINS`: `["https://your-frontend-domain.vercel.app"]`
3. **Background Worker** (Optional, for web crawlers):
   - Command: `celery -A app.workers.celery_app worker --loglevel=info`

### Frontend on Vercel / Netlify / Cloudflare Pages

1. Import the root repository.
2. Framework Preset: **Vite**
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Environment Variables:
   - `VITE_API_BASE_URL`: `https://your-backend-api.onrender.com/api/v1`

---

## Production Security Checklist

| Check | Action | Status |
|---|---|---|
| **Secret Key** | Set `APP_SECRET_KEY` to a cryptographically secure random value (`openssl rand -hex 32`) | Required |
| **Debug Mode** | Ensure `DEBUG=false` in production `.env` | Required |
| **CORS Origins** | Restrict `ALLOWED_ORIGINS` to your production frontend domain | Required |
| **Database** | Switch from SQLite to PostgreSQL (`postgresql+psycopg2://...`) | Automated in Compose |
| **SSL / HTTPS** | Configure SSL certificates via Let's Encrypt / Certbot or Cloudflare | Recommended |
| **Admin Password** | Change default admin credentials (`admin@shopscale.in`) upon first login | Recommended |

---

## Seed Data & Administrative Access

When the database is initialized:
- **Default Admin Account**: `admin@shopscale.in`
- **Default Password**: `Admin@ShopScale2026!`
- **Swagger Documentation**: `/docs`
- **Health Check Endpoint**: `/api/v1/health`
