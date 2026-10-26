"""Crawler Celery tasks with SSRF protection, robots.txt respect, and multi-page crawling."""
from __future__ import annotations

import time
import uuid
from collections import deque
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse

from app.workers.celery_app import celery_app
from app.core.logging import get_logger

logger = get_logger(__name__)

# Limits for crawl safety
MAX_PAGES_PER_JOB = 50
MAX_DEPTH = 3
MAX_PAGE_SIZE_BYTES = 5 * 1024 * 1024  # 5MB
REQUEST_TIMEOUT = 10.0
CRAWL_DELAY_SECONDS = 1.0


def _is_same_domain(url: str, seed_url: str) -> bool:
    """Check if a URL is on the same domain as the seed."""
    try:
        return urlparse(url).netloc == urlparse(seed_url).netloc
    except Exception:
        return False


def _normalize_url(url: str) -> str:
    """Normalize a URL by removing fragments and trailing slashes."""
    parsed = urlparse(url)
    normalized = parsed._replace(fragment="")
    result = normalized.geturl()
    if result.endswith("/") and result != f"{parsed.scheme}://{parsed.netloc}/":
        result = result.rstrip("/")
    return result


def _extract_links(html: str, base_url: str) -> list[str]:
    """Extract and normalize links from HTML."""
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, "html.parser")
    links = []
    for tag in soup.find_all("a", href=True):
        href = tag["href"]
        # Skip non-HTTP links
        if href.startswith(("javascript:", "mailto:", "tel:", "#", "data:")):
            continue
        absolute = urljoin(base_url, href)
        # Only follow HTTP(S)
        if urlparse(absolute).scheme in ("http", "https"):
            links.append(_normalize_url(absolute))
    return links


def _extract_product_metadata(html: str, url: str) -> dict | None:
    """Extract candidate product metadata from an HTML page."""
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, "html.parser")

    title_tag = soup.find("title")
    title = title_tag.text.strip()[:300] if title_tag else None

    # Try to find product-like metadata
    description = None
    meta_desc = soup.find("meta", {"name": "description"})
    if meta_desc:
        description = meta_desc.get("content", "")[:1000]

    # Look for price-like patterns (og:price or structured data)
    price_raw = None
    og_price = soup.find("meta", {"property": "og:price:amount"})
    if og_price:
        price_raw = og_price.get("content", "")

    # Look for primary image
    image_url = None
    og_image = soup.find("meta", {"property": "og:image"})
    if og_image:
        image_url = og_image.get("content", "")
    elif soup.find("img"):
        first_img = soup.find("img")
        if first_img and first_img.get("src"):
            image_url = urljoin(url, first_img["src"])

    return {
        "title": title,
        "description": description,
        "price_raw": price_raw,
        "image_url": image_url,
    }


@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    name="shopscale.crawler.run_crawl_job",
)
def run_crawl_job(self, job_id: str) -> dict:
    """Execute a crawl job asynchronously with safety checks and multi-page discovery."""
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

        # Multi-page crawl with BFS
        import httpx

        discovered = 0
        processed = 0
        failed = 0
        duplicates = 0
        pending_review = 0
        seen_urls: set[str] = set()
        queue: deque[tuple[str, int]] = deque()  # (url, depth)

        seed_normalized = _normalize_url(job.seed_url)
        queue.append((seed_normalized, 0))
        seen_urls.add(seed_normalized)

        try:
            with httpx.Client(
                timeout=REQUEST_TIMEOUT,
                follow_redirects=False,
                max_redirects=0,
                headers={"User-Agent": "ShopScaleBot/1.0"},
            ) as client:
                while queue and processed < MAX_PAGES_PER_JOB:
                    # Check for cancellation
                    db.refresh(job)
                    if job.status == "cancelled":
                        break

                    url, depth = queue.popleft()
                    discovered += 1

                    try:
                        resp = client.get(url)

                        # Check response size
                        content_length = resp.headers.get("content-length")
                        if content_length and int(content_length) > MAX_PAGE_SIZE_BYTES:
                            failed += 1
                            continue

                        if resp.status_code == 200:
                            content_type = resp.headers.get("content-type", "")
                            if "text/html" not in content_type.lower():
                                continue

                            html = resp.text
                            processed += 1

                            # Extract product metadata
                            metadata = _extract_product_metadata(html, url)

                            if metadata and metadata.get("title"):
                                # Check for duplicate result URLs
                                existing = db.query(CrawlResult).filter(
                                    CrawlResult.job_id == job.id,
                                    CrawlResult.source_url == url,
                                ).first()

                                if existing:
                                    duplicates += 1
                                else:
                                    import json
                                    result = CrawlResult(
                                        job_id=job.id,
                                        source_url=url,
                                        title=metadata.get("title"),
                                        description=metadata.get("description"),
                                        price_raw=metadata.get("price_raw"),
                                        image_url=metadata.get("image_url"),
                                        raw_data=json.dumps(metadata),
                                        status="pending_review",
                                    )
                                    db.add(result)
                                    pending_review += 1

                            # Extract and queue links (if within depth limit)
                            if depth < MAX_DEPTH:
                                links = _extract_links(html, url)
                                for link in links:
                                    normalized = _normalize_url(link)
                                    if (
                                        normalized not in seen_urls
                                        and _is_same_domain(normalized, job.seed_url)
                                    ):
                                        seen_urls.add(normalized)
                                        queue.append((normalized, depth + 1))

                            # Respect crawl delay
                            time.sleep(CRAWL_DELAY_SECONDS)

                        elif resp.status_code in (301, 302, 303, 307, 308):
                            # Handle redirects safely — do not follow blindly
                            location = resp.headers.get("location")
                            if location:
                                absolute = urljoin(url, location)
                                normalized = _normalize_url(absolute)
                                if (
                                    normalized not in seen_urls
                                    and _is_same_domain(normalized, job.seed_url)
                                ):
                                    seen_urls.add(normalized)
                                    queue.append((normalized, depth))
                        else:
                            failed += 1

                    except httpx.TimeoutException:
                        failed += 1
                        logger.warning("Crawl timeout", url=url)
                    except Exception as e:
                        failed += 1
                        logger.warning("Crawl error", url=url, error=str(e)[:200])

        except Exception as e:
            job.error_message = str(e)[:500]

        job.discovered_count = discovered
        job.processed_count = processed
        job.failed_count = failed
        job.duplicate_count = duplicates
        job.pending_review_count = pending_review
        job.status = "completed"
        job.completed_at = datetime.now(timezone.utc)
        db.commit()
        return {
            "status": "completed",
            "discovered": discovered,
            "processed": processed,
            "pending_review": pending_review,
            "failed": failed,
            "duplicates": duplicates,
        }

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
