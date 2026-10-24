"""Admin content management: banners, heritage articles, collections, coupons."""
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.permissions import require_role, UserRole
from app.db.session import get_db
from app.models.product import Banner, Collection, HeritageArticle
from app.models.order import Coupon
from app.schemas.order import CouponIn, CouponOut
from app.schemas.product import BannerOut, CollectionOut, HeritageArticleOut

router = APIRouter()


# ── Coupons ───────────────────────────────────────────────────────────────────

PAISE = 100


@router.get("/admin/coupons", response_model=list[CouponOut])
async def admin_list_coupons(
    token: Annotated[dict, Depends(require_role(UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
):
    return db.query(Coupon).order_by(Coupon.created_at.desc()).all()


@router.post("/admin/coupons", response_model=CouponOut, status_code=201)
async def admin_create_coupon(
    body: CouponIn,
    token: Annotated[dict, Depends(require_role(UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
):
    actor_id = uuid.UUID(token["sub"])
    existing = db.query(Coupon).filter(Coupon.code == body.code.upper()).first()
    if existing:
        raise HTTPException(status_code=409, detail="Coupon code already exists.")

    coupon = Coupon(
        code=body.code.upper(),
        discount_type=body.discount_type,
        discount_value=int(body.discount_value * (100 if body.discount_type == "percentage" else PAISE)),
        min_cart_paise=int(body.min_cart * PAISE),
        max_discount_paise=int(body.max_discount * PAISE) if body.max_discount else None,
        max_uses=body.max_uses,
        max_uses_per_customer=body.max_uses_per_customer,
        starts_at=body.starts_at,
        expires_at=body.expires_at,
        created_by_id=actor_id,
    )
    db.add(coupon)
    db.commit()
    db.refresh(coupon)
    return coupon


@router.patch("/admin/coupons/{coupon_id}")
async def admin_toggle_coupon(
    coupon_id: uuid.UUID,
    is_active: bool,
    token: Annotated[dict, Depends(require_role(UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
):
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found.")
    coupon.is_active = is_active
    db.commit()
    return {"id": str(coupon_id), "is_active": is_active}


# ── Collections ───────────────────────────────────────────────────────────────

class CollectionIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    image_url: str | None = None
    sort_order: int = 0


@router.get("/admin/collections", response_model=list[CollectionOut])
async def admin_list_collections(
    token: Annotated[dict, Depends(require_role(UserRole.PRODUCT_MANAGER))],
    db: Annotated[Session, Depends(get_db)],
):
    return db.query(Collection).order_by(Collection.sort_order).all()


@router.post("/admin/collections", response_model=CollectionOut, status_code=201)
async def admin_create_collection(
    body: CollectionIn,
    token: Annotated[dict, Depends(require_role(UserRole.PRODUCT_MANAGER))],
    db: Annotated[Session, Depends(get_db)],
):
    import re
    slug = re.sub(r"[^\w\s-]", "", body.name.lower())
    slug = re.sub(r"[\s_-]+", "-", slug).strip("-")
    collection = Collection(
        slug=slug, name=body.name,
        description=body.description, image_url=body.image_url,
        sort_order=body.sort_order,
    )
    db.add(collection)
    db.commit()
    db.refresh(collection)
    return collection


# ── Banners ───────────────────────────────────────────────────────────────────

class BannerIn(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    subtitle: str | None = None
    image_url: str = Field(min_length=1)
    link_to: str = Field(min_length=1)
    sort_order: int = 0
    is_active: bool = True


@router.get("/admin/banners", response_model=list[BannerOut])
async def admin_list_banners(
    token: Annotated[dict, Depends(require_role(UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
):
    return db.query(Banner).order_by(Banner.sort_order).all()


@router.post("/admin/banners", response_model=BannerOut, status_code=201)
async def admin_create_banner(
    body: BannerIn,
    token: Annotated[dict, Depends(require_role(UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
):
    actor_id = uuid.UUID(token["sub"])
    banner = Banner(**body.model_dump(), created_by_id=actor_id)
    db.add(banner)
    db.commit()
    db.refresh(banner)
    return banner


# ── Heritage Articles ─────────────────────────────────────────────────────────

class HeritageArticleIn(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    subtitle: str | None = None
    body: str | None = None
    image_url: str | None = None
    category: str | None = None
    is_published: bool = False


@router.get("/admin/heritage", response_model=list[HeritageArticleOut])
async def admin_list_heritage(
    token: Annotated[dict, Depends(require_role(UserRole.PRODUCT_MANAGER))],
    db: Annotated[Session, Depends(get_db)],
):
    return db.query(HeritageArticle).order_by(HeritageArticle.created_at.desc()).all()


@router.post("/admin/heritage", response_model=HeritageArticleOut, status_code=201)
async def admin_create_heritage(
    body: HeritageArticleIn,
    token: Annotated[dict, Depends(require_role(UserRole.PRODUCT_MANAGER))],
    db: Annotated[Session, Depends(get_db)],
):
    import re
    actor_id = uuid.UUID(token["sub"])
    slug = re.sub(r"[^\w\s-]", "", body.title.lower())
    slug = re.sub(r"[\s_-]+", "-", slug).strip("-")
    article = HeritageArticle(
        slug=slug, title=body.title, subtitle=body.subtitle,
        body=body.body, image_url=body.image_url, category=body.category,
        is_published=body.is_published, created_by_id=actor_id,
    )
    db.add(article)
    db.commit()
    db.refresh(article)
    return article
