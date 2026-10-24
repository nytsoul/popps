"""Admin product management endpoints."""
from __future__ import annotations

import json
import re
import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload

from app.core.permissions import get_current_token, require_role, UserRole
from app.db.session import get_db
from app.models.product import Inventory, Product, ProductImage, Variety
from app.schemas.product import ProductAdminOut, ProductIn, ProductOut, ProductUpdate

router = APIRouter()
PAISE = 100


def _slugify(name: str) -> str:
    s = name.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_-]+", "-", s)
    return s.strip("-")


def _ensure_unique_slug(db: Session, name: str, exclude_id: uuid.UUID | None = None) -> str:
    base = _slugify(name)
    slug = base
    counter = 1
    while True:
        q = db.query(Product).filter(Product.slug == slug)
        if exclude_id:
            q = q.filter(Product.id != exclude_id)
        if not q.first():
            return slug
        slug = f"{base}-{counter}"
        counter += 1


def _ensure_unique_sku(db: Session, product_name: str, exclude_id: uuid.UUID | None = None) -> str:
    """Generate a unique SKU."""
    base = "SS-" + _slugify(product_name)[:12].upper().replace("-", "")
    sku = base
    counter = 1
    while True:
        q = db.query(Product).filter(Product.sku == sku)
        if exclude_id:
            q = q.filter(Product.id != exclude_id)
        if not q.first():
            return sku
        sku = f"{base}{counter}"
        counter += 1


def _apply_input(product: Product, body: ProductIn | ProductUpdate, db: Session) -> None:
    if isinstance(body, ProductIn):
        # Full create
        product.name = body.name
        product.slug = _ensure_unique_slug(db, body.name, exclude_id=getattr(product, "id", None))
        product.sku = _ensure_unique_sku(db, body.name, exclude_id=getattr(product, "id", None))

    if body.description is not None:
        product.description = body.description
    if body.story is not None:
        product.story = body.story
    if body.fabric_name is not None:
        product.fabric_name = body.fabric_name
    if body.fabric_detail is not None:
        product.fabric_detail = body.fabric_detail
    if body.composition is not None:
        product.composition = body.composition
    if body.loom is not None:
        product.loom = body.loom
    if body.motif is not None:
        product.motif = body.motif
    if body.border is not None:
        product.border = body.border
    if body.weight_class is not None:
        product.weight_class = body.weight_class
    if body.weight_grams is not None:
        product.weight_grams = body.weight_grams
    if body.length_meters is not None:
        product.length_meters = body.length_meters
    if body.blouse_piece is not None:
        product.blouse_piece = body.blouse_piece
    if body.pallu_description is not None:
        product.pallu_description = body.pallu_description
    if body.care_type is not None:
        product.care_type = body.care_type
    if body.care_text is not None:
        product.care_text = body.care_text
    if body.primary_colour is not None:
        product.primary_colour = body.primary_colour
    if body.colours is not None:
        product.colours_json = json.dumps(body.colours)
    if body.color_variants is not None:
        product.color_variants_json = json.dumps(body.color_variants)
    if body.occasions is not None:
        product.occasions_json = json.dumps(body.occasions)
    if body.techniques is not None:
        product.techniques_json = json.dumps(body.techniques)
    if body.tags is not None:
        product.tags_json = json.dumps(body.tags)
    if body.collections is not None:
        product.collections_json = json.dumps(body.collections)
    if body.price is not None:
        product.price_paise = int(body.price * PAISE)
    if body.original_price is not None:
        product.compare_price_paise = int(body.original_price * PAISE)
    if body.badge is not None:
        product.badge = body.badge
    if body.is_bestseller is not None:
        product.is_bestseller = body.is_bestseller
    if body.is_new is not None:
        product.is_new = body.is_new
    if body.is_featured is not None:
        product.is_featured = body.is_featured
    if body.gift_eligible is not None:
        product.gift_eligible = body.gift_eligible
    if body.origin_verified is not None:
        product.origin_verified = body.origin_verified
    if body.admin_note is not None:
        product.admin_note = body.admin_note


def _product_with_relations(db: Session):
    return db.query(Product).options(
        selectinload(Product.images),
        selectinload(Product.inventory),
        selectinload(Product.variety_rel),
        selectinload(Product.region_rel),
    )


@router.get("/admin/products", response_model=list[ProductAdminOut])
async def admin_list_products(
    token: Annotated[dict, Depends(require_role(UserRole.PRODUCT_MANAGER))],
    db: Annotated[Session, Depends(get_db)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    publication: str | None = Query(default=None),
):
    from app.api.v1.routers.products import _product_to_admin_out
    q = _product_with_relations(db).filter(Product.deleted_at.is_(None))
    if publication:
        q = q.filter(Product.publication == publication)
    products = q.order_by(Product.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return [_product_to_admin_out(p) for p in products]


@router.post("/admin/products", response_model=ProductAdminOut, status_code=201)
async def admin_create_product(
    body: ProductIn,
    token: Annotated[dict, Depends(require_role(UserRole.PRODUCT_MANAGER))],
    db: Annotated[Session, Depends(get_db)],
):
    from app.api.v1.routers.products import _product_to_admin_out
    actor_id = uuid.UUID(token["sub"])
    product = Product(
        price_paise=int(body.price * PAISE),
        publication="draft",
        created_by_id=actor_id,
        updated_by_id=actor_id,
    )
    _apply_input(product, body, db)
    db.add(product)
    db.flush()

    # Create inventory record
    inv = Inventory(product_id=product.id, quantity_available=body.stock, low_stock_threshold=body.low_stock_threshold)
    db.add(inv)

    # Create image records
    for idx, url in enumerate(body.images or []):
        db.add(ProductImage(product_id=product.id, url=url, sort_order=idx, is_primary=(idx == 0)))

    db.commit()
    db.refresh(product)
    product = _product_with_relations(db).filter(Product.id == product.id).first()
    return _product_to_admin_out(product)


@router.get("/admin/products/{product_id}", response_model=ProductAdminOut)
async def admin_get_product(
    product_id: uuid.UUID,
    token: Annotated[dict, Depends(require_role(UserRole.PRODUCT_MANAGER))],
    db: Annotated[Session, Depends(get_db)],
):
    from app.api.v1.routers.products import _product_to_admin_out
    product = _product_with_relations(db).filter(Product.id == product_id, Product.deleted_at.is_(None)).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    return _product_to_admin_out(product)


@router.patch("/admin/products/{product_id}", response_model=ProductAdminOut)
async def admin_update_product(
    product_id: uuid.UUID,
    body: ProductUpdate,
    token: Annotated[dict, Depends(require_role(UserRole.PRODUCT_MANAGER))],
    db: Annotated[Session, Depends(get_db)],
):
    from app.api.v1.routers.products import _product_to_admin_out
    actor_id = uuid.UUID(token["sub"])
    product = _product_with_relations(db).filter(Product.id == product_id, Product.deleted_at.is_(None)).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    if body.name is not None:
        product.name = body.name
        product.slug = _ensure_unique_slug(db, body.name, exclude_id=product_id)
    _apply_input(product, body, db)
    product.updated_by_id = actor_id
    # Update images if provided
    if body.images is not None:
        for img in product.images:
            db.delete(img)
        db.flush()
        for idx, url in enumerate(body.images):
            db.add(ProductImage(product_id=product.id, url=url, sort_order=idx, is_primary=(idx == 0)))
    # Update inventory if stock provided — but track movement
    db.commit()
    product = _product_with_relations(db).filter(Product.id == product_id).first()
    return _product_to_admin_out(product)


@router.post("/admin/products/{product_id}/publish", response_model=ProductAdminOut)
async def admin_publish_product(
    product_id: uuid.UUID,
    token: Annotated[dict, Depends(require_role(UserRole.PRODUCT_MANAGER))],
    db: Annotated[Session, Depends(get_db)],
):
    from app.api.v1.routers.products import _product_to_admin_out
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    product.publication = "published"
    product.published_at = datetime.now(timezone.utc).isoformat()
    db.commit()
    product = _product_with_relations(db).filter(Product.id == product_id).first()
    return _product_to_admin_out(product)


@router.post("/admin/products/{product_id}/archive", response_model=ProductAdminOut)
async def admin_archive_product(
    product_id: uuid.UUID,
    token: Annotated[dict, Depends(require_role(UserRole.PRODUCT_MANAGER))],
    db: Annotated[Session, Depends(get_db)],
):
    from app.api.v1.routers.products import _product_to_admin_out
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    product.publication = "archived"
    db.commit()
    product = _product_with_relations(db).filter(Product.id == product_id).first()
    return _product_to_admin_out(product)


@router.delete("/admin/products/{product_id}", status_code=204)
async def admin_delete_product(
    product_id: uuid.UUID,
    token: Annotated[dict, Depends(require_role(UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
):
    """Soft-delete a product."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    product.deleted_at = datetime.now(timezone.utc).isoformat()
    product.publication = "archived"
    db.commit()
    return None
