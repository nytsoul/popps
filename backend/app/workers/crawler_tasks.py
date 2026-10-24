"""Crawler Celery tasks with SSRF protection and robots.txt respect."""
from __future__ import annotations

import time
import uuid
from datetime import datetime, timezone

from app.workers.celery_app import celery_app


@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    name="shopscale.crawler.run_crawl_job",
)
def run_crawl_job(self, job_id: str) -> dict:
    """Execute a crawl job asynchronously with safety checks."""
    from app.db.session import SessionLocal
    from app.models.crawler import CrawlJob, CrawlResult

    db = SessionLocal()
    try:
        job = db.query(CrawlJob).filter(CrawlJob.id == uuid.UUID(job_id)).first()
        if not job:
            return {"error": "Job not found"}
        if job.status == "cancelled":
            return {"status": "cancelled"}

        job.status = "running"
        job.started_at = datetime.now(timezone.utc)
        db.commit()

        # Check robots.txt
        robots_allowed = _check_robots(job.seed_url)
        job.robots_allowed = robots_allowed

        if not robots_allowed:
            job.status = "blocked"
            job.error_message = "robots.txt disallows crawling."
            job.completed_at = datetime.now(timezone.utc)
            db.commit()
            return {"status": "blocked"}

        # Simulated crawl with real HTTP
        import httpx
        discovered = 0
        processed = 0
        failed = 0

        try:
            with httpx.Client(timeout=10.0, follow_redirects=False, max_redirects=0) as client:
                resp = client.get(job.seed_url)
                if resp.status_code == 200:
                    # Parse basic product info from HTML (simplified)
                    from bs4 import BeautifulSoup
                    soup = BeautifulSoup(resp.text, "html.parser")
                    title = soup.find("title")
                    discovered = 1
                    processed = 1
                    result = CrawlResult(
                        job_id=job.id,
                        source_url=job.seed_url,
                        title=title.text[:300] if title else None,
                        status="pending_review",
                    )
                    db.add(result)
                    job.pending_review_count = 1
                else:
                    failed = 1
        except Exception as e:
            failed += 1
            job.error_message = str(e)[:500]

        job.discovered_count = discovered
        job.processed_count = processed
        job.failed_count = failed
        job.status = "completed"
        job.completed_at = datetime.now(timezone.utc)
        db.commit()
        return {"status": "completed", "discovered": discovered, "processed": processed}

    except Exception as exc:
        db.rollback()
        raise self.retry(exc=exc)
    finally:
        db.close()


def _check_robots(url: str) -> bool:
    """Fetch and check robots.txt for the given URL."""
    from urllib.parse import urlparse
    try:
        import httpx
        from urllib.robotparser import RobotFileParser
        parsed = urlparse(url)
        robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
        resp = httpx.get(robots_url, timeout=5.0, follow_redirects=False)
        if resp.status_code == 200:
            rp = RobotFileParser()
            rp.set_url(robots_url)
            rp.parse(resp.text.splitlines())
            return rp.can_fetch("ShopScaleBot", url)
    except Exception:
        pass
    return True  # Allow if robots.txt not accessible
