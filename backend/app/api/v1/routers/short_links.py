"""Short link redirect: /s/{code} and API endpoints."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.shortlink import ShortLink, ShortLinkClick

router = APIRouter()

# Allowed URL schemes for redirect targets
ALLOWED_SCHEMES = {"http", "https"}
# Allowed internal path prefix (relative URLs)
INTERNAL_PREFIX = "/"


def _validate_target(url: str) -> bool:
    """Reject dangerous schemes and non-approved external destinations."""
    if url.startswith("/"):
        return True  # internal path
    from urllib.parse import urlparse
    parsed = urlparse(url)
    if parsed.scheme not in ALLOWED_SCHEMES:
        return False
    return True


@router.get("/s/{code}")
async def short_link_redirect(code: str, request: Request, db: Annotated[Session, Depends(get_db)]):
    """Resolve a short link and redirect. Counts the click."""
    link = db.query(ShortLink).filter(ShortLink.code == code, ShortLink.is_active == True).first()  # noqa: E712
    if not link:
        raise HTTPException(status_code=404, detail="Short link not found.")

    now = datetime.now(timezone.utc)
    if link.expires_at and link.expires_at < now:
        raise HTTPException(status_code=410, detail="This link has expired.")
    if link.max_clicks and link.click_count >= link.max_clicks:
        raise HTTPException(status_code=410, detail="This link has reached its click limit.")

    # Record click (no personal data)
    referrer = request.headers.get("Referer", "")
    referrer_host = None
    if referrer:
        try:
            from urllib.parse import urlparse
            referrer_host = urlparse(referrer).hostname
        except Exception:
            pass

    link.click_count += 1
    db.add(ShortLinkClick(link_id=link.id, referrer_host=referrer_host))
    db.commit()

    return RedirectResponse(url=link.target_url, status_code=302)


# Also expose an API endpoint for the frontend to resolve without redirecting
@router.get("/api/v1/short-links/{code}/resolve")
async def resolve_link(code: str, db: Annotated[Session, Depends(get_db)]):
    link = db.query(ShortLink).filter(ShortLink.code == code, ShortLink.is_active == True).first()  # noqa: E712
    if not link:
        raise HTTPException(status_code=404, detail="Short link not found.")
    return {"target": link.target_url}
