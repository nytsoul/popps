"""Admin crawler job management with SSRF protection."""
from __future__ import annotations

import ipaddress
import socket
import uuid
from datetime import datetime, timezone
from typing import Annotated
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.permissions import require_role, UserRole
from app.db.session import get_db
from app.models.crawler import CrawlJob, CrawlResult, CrawlSource

router = APIRouter()

# Approved domains allowlist — extend via the CrawlSource table
BLOCKED_IP_PREFIXES = [
    "10.", "172.16.", "172.17.", "172.18.", "172.19.", "172.20.", "172.21.",
    "172.22.", "172.23.", "172.24.", "172.25.", "172.26.", "172.27.", "172.28.",
    "172.29.", "172.30.", "172.31.", "192.168.", "127.", "0.", "169.254.",
]

ALLOWED_SCHEMES = {"http", "https"}


def _ssrf_validate(url: str, approved_domains: list[str]) -> tuple[bool, str]:
    """Validate a URL against SSRF attack vectors."""
    try:
        parsed = urlparse(url)
    except Exception:
        return False, "Invalid URL."

    if parsed.scheme not in ALLOWED_SCHEMES:
        return False, f"Scheme '{parsed.scheme}' is not permitted."

    hostname = parsed.hostname
    if not hostname:
        return False, "No hostname in URL."

    if hostname not in approved_domains and not any(hostname.endswith(f".{d}") for d in approved_domains):
        return False, f"Domain '{hostname}' is not in the approved crawl sources list."

    # Resolve DNS and block private/loopback IPs
    try:
        addrs = socket.getaddrinfo(hostname, None)
        for addr in addrs:
            ip_str = addr[4][0]
            ip = ipaddress.ip_address(ip_str)
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
                return False, f"Resolved IP {ip_str} is a private/internal address — blocked for security."
    except socket.gaierror:
        return False, f"Cannot resolve hostname '{hostname}'."

    return True, "ok"


class StartCrawlRequest(BaseModel):
    seed_url: str = Field(min_length=8, max_length=1000)


@router.get("/admin/crawler/jobs")
async def admin_list_crawler_jobs(
    token: Annotated[dict, Depends(require_role(UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
):
    jobs = db.query(CrawlJob).order_by(CrawlJob.created_at.desc()).limit(100).all()
    return [
        {
            "id": str(j.id), "seed_url": j.seed_url, "status": j.status,
            "robots_allowed": j.robots_allowed, "discovered_count": j.discovered_count,
            "processed_count": j.processed_count, "failed_count": j.failed_count,
            "duplicate_count": j.duplicate_count, "pending_review_count": j.pending_review_count,
            "imported_count": j.imported_count, "started_at": j.started_at,
            "completed_at": j.completed_at, "created_at": j.created_at,
        }
        for j in jobs
    ]


@router.post("/admin/crawler/jobs", status_code=201)
async def admin_start_crawler_job(
    body: StartCrawlRequest,
    token: Annotated[dict, Depends(require_role(UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
):
    actor_id = uuid.UUID(token["sub"])
    approved_sources = db.query(CrawlSource).filter(CrawlSource.is_active == True).all()  # noqa: E712
    approved_domains = [s.domain for s in approved_sources]

    ok, reason = _ssrf_validate(body.seed_url, approved_domains)
    if not ok:
        raise HTTPException(status_code=400, detail=f"Crawl blocked: {reason}")

    job = CrawlJob(
        seed_url=body.seed_url,
        status="queued",
        created_by_id=actor_id,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Enqueue Celery task (if Celery is running)
    try:
        from app.workers.crawler_tasks import run_crawl_job
        task = run_crawl_job.delay(str(job.id))
        job.celery_task_id = task.id
        db.commit()
    except Exception:
        pass  # Celery not available — job stays queued

    return {"id": str(job.id), "status": job.status}


@router.post("/admin/crawler/jobs/{job_id}/cancel")
async def admin_cancel_crawler_job(
    job_id: uuid.UUID,
    token: Annotated[dict, Depends(require_role(UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
):
    job = db.query(CrawlJob).filter(CrawlJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    if job.status not in ("queued", "running"):
        raise HTTPException(status_code=409, detail="Job is not cancellable.")
    job.status = "cancelled"
    job.completed_at = datetime.now(timezone.utc)
    db.commit()
    return {"id": str(job_id), "status": "cancelled"}


@router.get("/admin/crawler/sources")
async def admin_list_crawl_sources(
    token: Annotated[dict, Depends(require_role(UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
):
    return db.query(CrawlSource).all()


@router.post("/admin/crawler/sources", status_code=201)
async def admin_add_crawl_source(
    domain: str,
    seed_url: str,
    token: Annotated[dict, Depends(require_role(UserRole.SUPER_ADMIN))],
    db: Annotated[Session, Depends(get_db)],
):
    """Only super_admin can approve new crawl domains."""
    actor_id = uuid.UUID(token["sub"])
    source = CrawlSource(domain=domain, seed_url=seed_url, created_by_id=actor_id)
    db.add(source)
    db.commit()
    return {"domain": domain, "seed_url": seed_url}


@router.get("/admin/crawler/jobs/{job_id}/results")
async def admin_get_crawler_job_results(
    job_id: uuid.UUID,
    token: Annotated[dict, Depends(require_role(UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
    status: str | None = None,
):
    """List results discovered by a specific crawl job."""
    query = db.query(CrawlResult).filter(CrawlResult.job_id == job_id)
    if status:
        query = query.filter(CrawlResult.status == status)
    results = query.order_by(CrawlResult.created_at.desc()).limit(200).all()
    return [
        {
            "id": str(r.id),
            "job_id": str(r.job_id),
            "source_url": r.source_url,
            "title": r.title,
            "description": r.description,
            "price_raw": r.price_raw,
            "image_url": r.image_url,
            "status": r.status,
            "imported_product_id": str(r.imported_product_id) if r.imported_product_id else None,
            "created_at": r.created_at,
        }
        for r in results
    ]


@router.post("/admin/crawler/jobs/{job_id}/approve")
async def admin_approve_crawler_job_results(
    job_id: uuid.UUID,
    token: Annotated[dict, Depends(require_role(UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
    count: int | None = None,
):
    """Approve pending crawl results for a job."""
    actor_id = uuid.UUID(token["sub"])
    job = db.query(CrawlJob).filter(CrawlJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    query = db.query(CrawlResult).filter(
        CrawlResult.job_id == job_id,
        CrawlResult.status == "pending_review",
    )
    if count and count > 0:
        pending_items = query.limit(count).all()
    else:
        pending_items = query.all()

    approved_count = len(pending_items)
    for item in pending_items:
        item.status = "approved"
        item.reviewed_by_id = actor_id

    job.pending_review_count = max(0, job.pending_review_count - approved_count)
    job.imported_count = (job.imported_count or 0) + approved_count
    db.commit()

    return {
        "status": "approved",
        "job_id": str(job_id),
        "approved_count": approved_count,
        "remaining_pending": job.pending_review_count,
    }


@router.post("/admin/crawler/jobs/{job_id}/reject")
async def admin_reject_crawler_job_results(
    job_id: uuid.UUID,
    token: Annotated[dict, Depends(require_role(UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
):
    """Reject all pending crawl results for a job."""
    actor_id = uuid.UUID(token["sub"])
    job = db.query(CrawlJob).filter(CrawlJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    pending_items = db.query(CrawlResult).filter(
        CrawlResult.job_id == job_id,
        CrawlResult.status == "pending_review",
    ).all()

    rejected_count = len(pending_items)
    for item in pending_items:
        item.status = "rejected"
        item.reviewed_by_id = actor_id

    job.pending_review_count = 0
    db.commit()

    return {
        "status": "rejected",
        "job_id": str(job_id),
        "rejected_count": rejected_count,
    }


@router.post("/admin/crawler/results/{result_id}/import")
async def admin_import_crawler_result(
    result_id: uuid.UUID,
    token: Annotated[dict, Depends(require_role(UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
):
    """Import an approved crawl result into the product catalogue as a draft product."""
    from app.models.product import Inventory, Product, ProductImage
    import re

    actor_id = uuid.UUID(token["sub"])
    result = db.query(CrawlResult).filter(CrawlResult.id == result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Crawl result not found.")
    if result.status == "imported":
        raise HTTPException(status_code=400, detail="Result has already been imported.")

    # Parse price
    price_paise = 2500000  # Default ₹25,000
    if result.price_raw:
        numeric = re.sub(r"[^\d.]", "", result.price_raw)
        if numeric:
            try:
                price_paise = int(float(numeric) * 100)
            except ValueError:
                pass
    if price_paise <= 0:
        price_paise = 100000

    unique_suffix = uuid.uuid4().hex[:8]
    slug_base = re.sub(r"[^a-z0-9]+", "-", (result.title or "imported-saree").lower()).strip("-")[:180]
    slug = f"{slug_base}-{unique_suffix}"
    sku = f"SKU-CRW-{unique_suffix.upper()}"

    product = Product(
        name=result.title or "Imported Handcrafted Saree",
        slug=slug,
        sku=sku,
        description=result.description or "Imported via web crawler. Pending editorial review.",
        price_paise=price_paise,
        publication="draft",
        created_by_id=actor_id,
    )
    db.add(product)
    db.flush()

    # Create associated inventory
    inventory = Inventory(
        product_id=product.id,
        quantity_available=1,
        quantity_reserved=0,
        quantity_committed=0,
        updated_by_id=actor_id,
    )
    db.add(inventory)

    # Create image if URL available
    if result.image_url:
        img = ProductImage(
            product_id=product.id,
            url=result.image_url,
            alt_text=product.name,
            sort_order=0,
            is_primary=True,
        )
        db.add(img)

    result.status = "imported"
    result.imported_product_id = product.id
    result.reviewed_by_id = actor_id

    # Update job counter
    job = db.query(CrawlJob).filter(CrawlJob.id == result.job_id).first()
    if job:
        job.imported_count = (job.imported_count or 0) + 1
        if job.pending_review_count > 0:
            job.pending_review_count -= 1

    db.commit()
    db.refresh(product)

    return {
        "status": "imported",
        "result_id": str(result.id),
        "product_id": str(product.id),
        "sku": product.sku,
        "slug": product.slug,
    }
