"""Health and readiness endpoints."""
from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.db.session import check_db_connection

router = APIRouter()


@router.get("/health")
async def health() -> dict:
    """Basic liveness check. Always returns 200 if the process is running."""
    return {"status": "ok", "service": "shopscale-api"}


@router.get("/ready")
async def ready() -> JSONResponse:
    """Readiness check — verifies essential dependencies are reachable."""
    checks: dict[str, str] = {}
    all_ok = True

    # Database
    db_ok = check_db_connection()
    checks["database"] = "ok" if db_ok else "unavailable"
    if not db_ok:
        all_ok = False

    # Redis (optional — degrade gracefully if not configured)
    try:
        import redis as redis_lib
        from app.core.config import settings
        r = redis_lib.from_url(settings.redis_url, socket_connect_timeout=1)
        r.ping()
        checks["redis"] = "ok"
    except Exception:
        checks["redis"] = "unavailable"
        # Redis is optional for basic operation

    status_code = 200 if all_ok else 503
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "ready" if all_ok else "degraded",
            "checks": checks,
        },
    )
