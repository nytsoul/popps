"""Admin short link management endpoints."""
from __future__ import annotations

import secrets
import uuid
from datetime import datetime
from typing import Annotated
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.permissions import require_role, UserRole
from app.db.session import get_db
from app.models.shortlink import ShortLink, ShortLinkClick

router = APIRouter()

BLOCKED_SCHEMES = {"javascript", "data", "vbscript", "file"}
ALLOWED_SCHEMES = {"http", "https"}


def _validate_target(url: str) -> bool:
    if url.startswith("/"):
        return True  # internal path always allowed
    try:
        parsed = urlparse(url)
        if parsed.scheme in BLOCKED_SCHEMES:
            return False
        return parsed.scheme in ALLOWED_SCHEMES
    except Exception:
        return False


class ShortLinkIn(BaseModel):
    target_url: str = Field(min_length=1, max_length=2000)
    label: str | None = Field(default=None, max_length=300)
    campaign_tag: str | None = Field(default=None, max_length=100)
    max_clicks: int | None = Field(default=None, ge=1)
    expires_at: datetime | None = None


class ShortLinkOut(BaseModel):
    id: uuid.UUID
    code: str
    target_url: str
    label: str | None
    campaign_tag: str | None
    click_count: int
    max_clicks: int | None
    is_active: bool
    expires_at: datetime | None
    created_at: datetime
    model_config = {"from_attributes": True}


@router.get("/admin/short-links", response_model=list[ShortLinkOut])
async def admin_list_short_links(
    token: Annotated[dict, Depends(require_role(UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
):
    return db.query(ShortLink).order_by(ShortLink.created_at.desc()).limit(200).all()


@router.post("/admin/short-links", response_model=ShortLinkOut, status_code=201)
async def admin_create_short_link(
    body: ShortLinkIn,
    token: Annotated[dict, Depends(require_role(UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
):
    actor_id = uuid.UUID(token["sub"])
    if not _validate_target(body.target_url):
        raise HTTPException(status_code=400, detail="Target URL scheme is not permitted.")

    code = secrets.token_urlsafe(4)[:6]
    # Ensure uniqueness
    while db.query(ShortLink).filter(ShortLink.code == code).first():
        code = secrets.token_urlsafe(4)[:6]

    link = ShortLink(
        code=code,
        target_url=body.target_url,
        label=body.label,
        campaign_tag=body.campaign_tag,
        max_clicks=body.max_clicks,
        expires_at=body.expires_at,
        created_by_id=actor_id,
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    return link


@router.patch("/admin/short-links/{link_id}/disable", status_code=200)
async def admin_disable_short_link(
    link_id: uuid.UUID,
    token: Annotated[dict, Depends(require_role(UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
):
    link = db.query(ShortLink).filter(ShortLink.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Short link not found.")
    link.is_active = False
    db.commit()
    return {"id": str(link_id), "is_active": False}


@router.delete("/admin/short-links/{link_id}", status_code=204)
async def admin_delete_short_link(
    link_id: uuid.UUID,
    token: Annotated[dict, Depends(require_role(UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
):
    link = db.query(ShortLink).filter(ShortLink.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Short link not found.")
    db.delete(link)
    db.commit()
    return None
