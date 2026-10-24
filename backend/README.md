# ShopScale Backend

Production-oriented FastAPI backend for **ShopScale** — a premium saree e-commerce platform.

## Tech Stack

| Layer | Technology |
|---|---|
| API Framework | FastAPI + Pydantic v2 |
| ORM | SQLAlchemy 2.x |
| DB (production) | PostgreSQL 16 |
| DB (testing) | SQLite |
| Migrations | Alembic |
| Auth | JWT (HS256) + Argon2id passwords |
| Cache / Queue | Redis 7 |
| Background Tasks | Celery |
| Logging | structlog |

## Quick Start (Local Windows without Docker)

### 1. Install PostgreSQL and Redis locally

- **PostgreSQL**: Download from [postgresql.org](https://www.postgresql.org/download/windows/)
  - Create DB: `createdb shopscale` and user: `createuser shopscale`
- **Redis**: Use [Memurai](https://www.memurai.com/) (Windows Redis-compatible) or WSL2 + Redis

### 2. Create and activate a virtual environment

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 3. Configure environment

```powershell
Copy-Item .env.example .env
# Edit .env with your PostgreSQL and Redis URLs
notepad .env
```

### 4. Run database migrations

```powershell
alembic upgrade head
```

### 5. Seed the development database

```powershell
python -m app.db.seed
```

### 6. Create the admin account

```powershell
# Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD in .env first
python -m app.db.bootstrap_admin
```

### 7. Start the development server

```powershell
uvicorn app.main:app --reload --port 8000
```

API docs available at: **http://localhost:8000/api/docs**

### 8. Connect the frontend

In the frontend `.env`, set:

```
VITE_API_BASE_URL=http://localhost:8000
```

---

## Run Tests

```powershell
pytest app/tests/ -v
```

Tests use SQLite — no PostgreSQL required.

---

## Docker (optional)

```powershell
docker-compose up --build
```

---

## API Routes

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/health` | Liveness |
| GET | `/api/v1/ready` | Readiness |
| POST | `/api/v1/auth/register` | Register |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/forgot-password` | Password reset |
| GET | `/api/v1/products` | Product list |
| POST | `/api/v1/products/search` | Product search |
| GET | `/api/v1/products/{slug}` | Product detail |
| GET | `/api/v1/cart` | Get cart |
| POST | `/api/v1/cart/items` | Add to cart |
| POST | `/api/v1/checkout/validate` | Checkout price |
| POST | `/api/v1/orders` | Place order |
| GET | `/api/v1/orders` | Order history |
| POST | `/api/v1/payments/create` | Create payment |
| POST | `/api/v1/payments/webhook` | Payment webhook |
| GET | `/api/v1/regions` | Regions |
| GET | `/api/v1/varieties` | Varieties |
| GET | `/api/v1/fabrics` | Fabrics |
| GET | `/api/v1/collections` | Collections |
| GET | `/api/v1/banners` | Banners |
| GET | `/api/v1/heritage` | Heritage articles |
| GET\|POST | `/api/v1/reviews` | Product reviews |
| POST | `/api/v1/support/tickets` | Contact form |
| GET | `/s/{code}` | Short link redirect |
| GET | `/api/v1/admin/*` | Admin endpoints (RBAC) |

---

## Security Notes

- **Argon2id** hashing for all passwords
- **JWT HS256** access tokens (30 min expiry), opaque refresh tokens
- **Role hierarchy** RBAC: `customer → support → inventory → product_manager → admin → super_admin`
- **SSRF protection** on crawler: domain allowlist + DNS resolution check for private IP ranges
- **URL scheme validation** on short links (blocks `javascript:`, `data:`, etc.)
- **Order price re-validation** server-side at checkout — client-side price is never trusted
- **Idempotency keys** on order creation prevent duplicate orders
- **Stock locking** with PostgreSQL `FOR UPDATE` during order creation
- **Audit log** for sensitive admin actions
- **Soft delete** on products — no data loss

---

> **IMPORTANT — Sample Data Notice**
> All seed data (artisan names, provenance claims, weaver stories, GI tag references) is
> **SAMPLE/DEMO content** clearly marked with `[SAMPLE DATA]`.  
> It has NOT been independently verified and must not be presented as factual to customers.
> Replace all seed data with verified content before going to production.
