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
from app.models.crawler import CrawlJob, CrawlSource

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
