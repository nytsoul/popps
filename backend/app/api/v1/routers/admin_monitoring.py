"""Admin monitoring, system health, events, JMeter, and cache management endpoints."""
from __future__ import annotations

import time
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.permissions import require_role, UserRole
from app.db.session import get_db, check_db_connection
from app.models.order import Order
from app.models.product import Inventory, Product

router = APIRouter()


# ── System Health ────────────────────────────────────────────────────────────

@router.get("/admin/monitoring/summary")
async def admin_monitoring_summary(
    token: Annotated[dict, Depends(require_role(UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
):
    """System health summary. Returns actual operational data only."""
    result: dict = {}

    # Database
    db_ok = check_db_connection()
    result["database"] = {"status": "healthy" if db_ok else "unhealthy"}

    # Redis (real health check via cache service)
    from app.integrations.redis_cache import get_cache_service
    cache = get_cache_service()
    result["redis"] = cache.health_check()

    # Kafka (real broker check)
    from app.integrations.kafka_events import get_event_service
    events = get_event_service()
    result["kafka"] = events.health_check()

    # Celery workers
    celery_status = "not_configured"
    try:
        from app.workers.celery_app import celery_app
        i = celery_app.control.inspect(timeout=1.0)
        active = i.active()
        celery_status = "healthy" if active is not None else "unhealthy"
    except Exception:
        celery_status = "unhealthy"
    result["celery"] = {"status": celery_status}

    # Product counts
    if db_ok:
        try:
            result["products"] = {
                "total": db.query(Product).filter(Product.deleted_at.is_(None)).count(),
                "published": db.query(Product).filter(Product.publication == "published", Product.deleted_at.is_(None)).count(),
                "draft": db.query(Product).filter(Product.publication == "draft", Product.deleted_at.is_(None)).count(),
            }
            result["orders"] = {
                "total": db.query(Order).count(),
                "pending": db.query(Order).filter(Order.status == "pending_payment").count(),
                "confirmed": db.query(Order).filter(Order.status == "confirmed").count(),
            }
            low_stock = db.query(Inventory).filter(
                Inventory.quantity_available <= Inventory.low_stock_threshold,
                Inventory.quantity_available > 0,
            ).count()
            out_of_stock = db.query(Inventory).filter(Inventory.quantity_available == 0).count()
            result["inventory"] = {"low_stock_count": low_stock, "out_of_stock_count": out_of_stock}
        except Exception as e:
            result["error"] = "Could not retrieve metrics."

    return result


@router.get("/admin/dashboard")
async def admin_dashboard(
    token: Annotated[dict, Depends(require_role(UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
):
    """Dashboard summary statistics."""
    from app.models.user import User
    from app.models.support import SupportTicket

    stats: dict = {}
    try:
        stats["total_products"] = db.query(Product).filter(Product.publication == "published", Product.deleted_at.is_(None)).count()
        stats["total_orders"] = db.query(Order).count()
        stats["total_customers"] = db.query(User).filter(User.role == "customer").count()
        stats["open_tickets"] = db.query(SupportTicket).filter(SupportTicket.status.in_(["open", "in_progress"])).count()
        stats["low_stock_items"] = db.query(Inventory).filter(
            Inventory.quantity_available <= Inventory.low_stock_threshold
        ).count()
    except Exception:
        stats["error"] = "Metrics unavailable."

    return stats


# ── Redis / Cache ────────────────────────────────────────────────────────────

@router.get("/admin/infra/redis")
async def admin_redis_status(
    token: Annotated[dict, Depends(require_role(UserRole.ADMIN))],
):
    """Returns real Redis/cache status, statistics, and health."""
    from app.integrations.redis_cache import get_cache_service
    cache = get_cache_service()
    return {
        **cache.health_check(),
        "stats": cache.get_stats(),
    }


@router.post("/admin/infra/redis/flush")
async def admin_redis_flush(
    token: Annotated[dict, Depends(require_role(UserRole.ADMIN))],
):
    """Flushes cache keys in the ShopScale namespace (admin operation)."""
    from app.integrations.redis_cache import get_cache_service
    cache = get_cache_service()
    removed = cache.flush_namespace()
    cache.stats.reset()
    return {"status": "ok", "message": f"Flushed {removed} cached keys", "removed": removed}


@router.get("/admin/infra/cache/stats")
async def admin_cache_stats(
    token: Annotated[dict, Depends(require_role(UserRole.ADMIN))],
):
    """Returns cache hit/miss/invalidation statistics."""
    from app.integrations.redis_cache import get_cache_service
    cache = get_cache_service()
    return cache.get_stats()


# ── Kafka Events ─────────────────────────────────────────────────────────────

@router.get("/admin/events/topics")
async def admin_kafka_topics(
    token: Annotated[dict, Depends(require_role(UserRole.ADMIN))],
):
    """Returns Kafka event pipeline status with real broker checks."""
    from app.integrations.kafka_events import get_event_service
    svc = get_event_service()
    health = svc.health_check()
    stats = svc.get_stats()
    return {
        **health,
        **stats,
    }


@router.post("/admin/events/publish")
async def admin_kafka_publish(
    token: Annotated[dict, Depends(require_role(UserRole.ADMIN))],
    payload: dict,
):
    """Publish a test event. Uses real Kafka if configured, else in-memory bus."""
    from app.integrations.kafka_events import get_event_service
    svc = get_event_service()
    health = svc.health_check()

    topic = payload.get("topic", "orders.created")
    key = payload.get("key", "test-key")
    data = payload.get("data", {})

    event = svc.publish(topic, key, data)

    backend = health.get("backend", "none")
    if backend == "none" or health.get("status") == "not_configured":
        raise HTTPException(
            status_code=503,
            detail="Kafka broker is not configured; no event was published.",
        )

    event = svc.publish(topic, key, data)

    return {
        "status": "published",
        "event_id": event.id,
        "backend": backend,
        "topic": topic,
        "key": key,
    }


@router.get("/admin/events/log")
async def admin_event_log(
    token: Annotated[dict, Depends(require_role(UserRole.ADMIN))],
    topic: str | None = None,
    limit: int = 100,
):
    """Returns recent event log entries."""
    from app.integrations.kafka_events import get_event_service
    svc = get_event_service()
    return {"events": svc.get_events(topic=topic, limit=limit)}


@router.get("/admin/events/dlq")
async def admin_dlq_events(
    token: Annotated[dict, Depends(require_role(UserRole.ADMIN))],
):
    """Returns DLQ (dead-letter queue) events for inspection."""
    from app.integrations.kafka_events import get_event_service
    svc = get_event_service()
    return {"dlq_events": svc.get_dlq_events()}


@router.post("/admin/events/dlq/{event_id}/replay")
async def admin_replay_dlq_event(
    event_id: str,
    token: Annotated[dict, Depends(require_role(UserRole.ADMIN))],
):
    """Replay a DLQ event (admin recovery action)."""
    from app.integrations.kafka_events import get_event_service
    svc = get_event_service()
    event = svc.replay_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"status": "replayed", "new_event_id": event.id}


# ── Rate Limiting ────────────────────────────────────────────────────────────

@router.get("/admin/monitoring/ratelimit")
async def admin_ratelimit_status(
    token: Annotated[dict, Depends(require_role(UserRole.ADMIN))],
):
    """Returns rate limit configuration and backend status."""
    from app.core.config import settings
    from app.integrations.redis_cache import get_cache_service
    cache = get_cache_service()
    redis_connected = cache.is_redis_connected

    return {
        "status": "active",
        "backend": "redis_sliding_window" if redis_connected else "in_memory_sliding_window",
        "redis_connected": redis_connected,
        "rules": {
            "default": settings.rate_limit_default,
            "auth": settings.rate_limit_auth,
        },
        "burst_protection": True,
    }


# ── JMeter Reports ───────────────────────────────────────────────────────────

# In-memory store for imported JMeter reports (per-session; use DB for persistence)
_jmeter_reports: dict[str, dict] = {}


@router.post("/admin/monitoring/jmeter/upload")
async def admin_upload_jmeter_report(
    token: Annotated[dict, Depends(require_role(UserRole.ADMIN))],
    file: UploadFile = File(...),
):
    """Upload and parse a JMeter JTL report file."""
    from app.integrations.jmeter_parser import (
        compute_metrics,
        parse_jtl_csv,
        validate_jtl_content,
    )
    import uuid

    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    # Read file content
    content = await file.read()
    try:
        text_content = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8 encoded text")

    # Validate
    valid, reason = validate_jtl_content(text_content)
    if not valid:
        raise HTTPException(status_code=400, detail=f"Invalid JTL file: {reason}")

    # Parse and compute metrics
    try:
        samples = parse_jtl_csv(text_content)
        metrics = compute_metrics(samples)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Store report
    report_id = str(uuid.uuid4())
    from datetime import datetime, timezone
    _jmeter_reports[report_id] = {
        "id": report_id,
        "filename": file.filename,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "metrics": metrics.to_dict(),
        "is_sample_data": False,
    }

    return {
        "id": report_id,
        "filename": file.filename,
        "sample_count": metrics.sample_count,
        "metrics": metrics.to_dict(),
    }


@router.get("/admin/monitoring/jmeter/reports")
async def admin_list_jmeter_reports(
    token: Annotated[dict, Depends(require_role(UserRole.ADMIN))],
):
    """List all imported JMeter reports."""
    if not _jmeter_reports:
        return {
            "reports": [],
            "note": "No JMeter reports imported yet. Upload a .jtl file to see real performance metrics.",
        }
    return {
        "reports": [
            {
                "id": r["id"],
                "filename": r["filename"],
                "uploaded_at": r["uploaded_at"],
                "sample_count": r["metrics"]["sample_count"],
                "is_sample_data": r["is_sample_data"],
            }
            for r in _jmeter_reports.values()
        ]
    }


@router.get("/admin/monitoring/jmeter/reports/{report_id}")
async def admin_get_jmeter_report(
    report_id: str,
    token: Annotated[dict, Depends(require_role(UserRole.ADMIN))],
):
    """Get a specific JMeter report with full metrics."""
    report = _jmeter_reports.get(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report
