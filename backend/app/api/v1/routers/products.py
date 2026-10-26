"""Product catalogue: public listing, search, and product detail."""
from __future__ import annotations

import json
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, text
from sqlalchemy.orm import Session, selectinload

from app.db.session import get_db
from app.models.product import Inventory, Product, ProductImage, Region, Variety
from app.schemas.product import (
    FacetCount,
    PagedProducts,
    ProductAdminOut,
    ProductOut,
    ProductSearchRequest,
)

router = APIRouter()

PAISE_TO_RUPEES = 100


def _product_to_out(p: Product) -> ProductOut:
    """Convert ORM product to Pydantic schema."""
    inv = p.inventory
    variety = p.variety_rel
    region = p.region_rel
    artisan = None
    # try artisan through relationship
    try:
        from app.models.product import Artisan
        artisan_obj = None
    except Exception:
        artisan_obj = None

    return ProductOut(
        id=p.id,
        slug=p.slug,
        name=p.name,
        sku=p.sku,
        description=p.description,
        story=p.story,
        variety=variety.name if variety else None,
        variety_slug=variety.slug if variety else None,
        region=region.name if region else None,
        state=region.name if region else None,
        country=region.country if region else None,
        zone=region.zone if region else None,
        garment_kind=variety.garment_kind if variety else None,
        fabric_name=p.fabric_name,
        fabric_detail=p.fabric_detail,
        composition=p.composition,
        loom=p.loom,
        motif=p.motif,
        border=p.border,
        weight_class=p.weight_class,
        weight_grams=p.weight_grams,
        length_meters=p.length_meters,
        blouse_piece=p.blouse_piece,
        pallu_description=p.pallu_description,
        care_type=p.care_type,
        care_text=p.care_text,
        primary_colour=p.primary_colour,
        colours=json.loads(p.colours_json) if p.colours_json else [],
        color_variants=json.loads(p.color_variants_json) if p.color_variants_json else [],
        occasions=json.loads(p.occasions_json) if p.occasions_json else [],
        techniques=json.loads(p.techniques_json) if p.techniques_json else [],
        tags=json.loads(p.tags_json) if p.tags_json else [],
        collections=json.loads(p.collections_json) if p.collections_json else [],
        price=p.price_paise / PAISE_TO_RUPEES,
        original_price=(p.compare_price_paise / PAISE_TO_RUPEES) if p.compare_price_paise else None,
        badge=p.badge,
        is_bestseller=p.is_bestseller,
        is_new=p.is_new,
        is_featured=p.is_featured,
        gift_eligible=p.gift_eligible,
        origin_verified=p.origin_verified,
        artisan_name=None,
        publication=p.publication,
        images=[
            {"id": img.id, "url": img.url, "alt_text": img.alt_text,
             "sort_order": img.sort_order, "is_primary": img.is_primary}
            for img in (p.images or [])
        ],
        stock=inv.quantity_available if inv else 0,
        low_stock_threshold=inv.low_stock_threshold if inv else 3,
        rating=0.0,
        review_count=0,
        created_at=p.created_at,
        updated_at=p.updated_at,
    )


def _product_to_admin_out(p: Product) -> ProductAdminOut:
    """Convert ORM product to ProductAdminOut schema."""
    base = _product_to_out(p).model_dump()
    base["admin_note"] = p.admin_note
    base["created_by_id"] = p.created_by_id
    base["updated_by_id"] = p.updated_by_id
    return ProductAdminOut(**base)


def _base_query(db: Session, include_unpublished: bool = False):
    q = (
        db.query(Product)
        .options(
            selectinload(Product.images),
            selectinload(Product.inventory),
            selectinload(Product.variety_rel),
            selectinload(Product.region_rel),
        )
        .filter(Product.deleted_at.is_(None))
    )
    if not include_unpublished:
        q = q.filter(Product.publication == "published")
    return q


# ── GET /products ─────────────────────────────────────────────────────────────

@router.get("/products", response_model=PagedProducts)
async def list_products(
    db: Annotated[Session, Depends(get_db)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=24, ge=1, le=100),
    sort: str = Query(default="recommended"),
    q: str | None = Query(default=None),
    fabric: str | None = Query(default=None),
    state: str | None = Query(default=None),
    occasion: str | None = Query(default=None),
    colour: str | None = Query(default=None),
    loom: str | None = Query(default=None),
    variety: str | None = Query(default=None),
    min_price: float | None = Query(default=None, ge=0),
    max_price: float | None = Query(default=None, ge=0),
):
    query = _base_query(db)

    # Text search
    if q:
        search_term = q.strip()
        query = query.filter(
            or_(
                Product.name.ilike(f"%{search_term}%"),
                Product.description.ilike(f"%{search_term}%"),
                Product.fabric_name.ilike(f"%{search_term}%"),
            )
        )

    # Filters
    if fabric:
        query = query.filter(Product.fabric_name.ilike(f"%{fabric}%"))
    if loom:
        query = query.filter(Product.loom == loom)
    if min_price is not None:
        query = query.filter(Product.price_paise >= int(min_price * PAISE_TO_RUPEES))
    if max_price is not None:
        query = query.filter(Product.price_paise <= int(max_price * PAISE_TO_RUPEES))

    # Sorting
    sort_map = {
        "newest": Product.created_at.desc(),
        "price-asc": Product.price_paise.asc(),
        "price-desc": Product.price_paise.desc(),
        "recommended": Product.is_featured.desc(),
    }
    query = query.order_by(sort_map.get(sort, Product.created_at.desc()))

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return PagedProducts(
        items=[_product_to_out(p) for p in items],
        total=total,
        page=page,
        page_size=page_size,
        facets={},
        meta={"cache": "MISS", "ms": 0},
    )


# ── POST /products/search ─────────────────────────────────────────────────────

@router.post("/products/search", response_model=PagedProducts)
async def search_products(
    body: ProductSearchRequest,
    db: Annotated[Session, Depends(get_db)],
):
    import time
    start = time.perf_counter()
    query = _base_query(db, include_unpublished=body.include_unpublished)

    if body.q:
        term = body.q.strip()
        query = query.filter(
            or_(
                Product.name.ilike(f"%{term}%"),
                Product.description.ilike(f"%{term}%"),
                Product.story.ilike(f"%{term}%"),
                Product.fabric_name.ilike(f"%{term}%"),
                Product.tags_json.ilike(f"%{term}%"),
            )
        )

    # Filter by JSON-encoded arrays (simple substring match)
    for key, values in (body.filters or {}).items():
        if not values:
            continue
        col_map = {
            "fabric": Product.fabric_name,
            "loom": Product.loom,
            "composition": Product.composition,
            "motif": Product.motif,
            "border": Product.border,
            "weight": Product.weight_class,
        }
        if key in col_map:
            col = col_map[key]
            query = query.filter(or_(*[col.ilike(f"%{v}%") for v in values]))
        elif key in ("category", "variety"):
            query = query.join(Product.variety_rel).filter(
                or_(*[Variety.name.ilike(v) for v in values])
            )
        elif key in ("state", "zone", "country"):
            region_column = Region.name if key == "state" else getattr(Region, key)
            query = query.join(Product.region_rel).filter(
                or_(*[region_column.ilike(v) for v in values])
            )
        elif key in ("occasion", "colour", "weave", "collection"):
            json_col_map = {
                "occasion": Product.occasions_json,
                "colour": Product.colours_json,
                "weave": Product.techniques_json,
                "collection": Product.collections_json,
            }
            jcol = json_col_map[key]
            query = query.filter(or_(*[jcol.ilike(f"%{v}%") for v in values]))

    if body.min_price is not None:
        query = query.filter(Product.price_paise >= int(body.min_price * PAISE_TO_RUPEES))
    if body.max_price is not None:
        query = query.filter(Product.price_paise <= int(body.max_price * PAISE_TO_RUPEES))

    sort_map = {
        "newest": Product.created_at.desc(),
        "price-asc": Product.price_paise.asc(),
        "price-desc": Product.price_paise.desc(),
        "recommended": Product.is_featured.desc(),
        "popularity": Product.is_bestseller.desc(),
    }
    query = query.order_by(sort_map.get(body.sort, Product.created_at.desc()))

    total = query.count()
    items = query.offset((body.page - 1) * body.page_size).limit(body.page_size).all()
    ms = round((time.perf_counter() - start) * 1000)

    return PagedProducts(
        items=[_product_to_out(p) for p in items],
        total=total,
        page=body.page,
        page_size=body.page_size,
        facets={},
        meta={"cache": "MISS", "ms": ms},
    )


# ── GET /products/{slug} ──────────────────────────────────────────────────────

@router.get("/products/{slug}", response_model=ProductOut)
async def get_product(slug: str, db: Annotated[Session, Depends(get_db)]):
    product = (
        db.query(Product)
        .options(
            selectinload(Product.images),
            selectinload(Product.inventory),
            selectinload(Product.variety_rel),
            selectinload(Product.region_rel),
        )
        .filter(Product.slug == slug, Product.publication == "published", Product.deleted_at.is_(None))
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    return _product_to_out(product)
