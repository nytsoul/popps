"""Wishlist endpoints for authenticated users."""
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session, selectinload

from app.core.permissions import get_current_token
from app.db.session import get_db
from app.models.order import WishlistItem
from app.models.product import Product
from app.schemas.product import ProductOut

router = APIRouter()


@router.get("/wishlist", response_model=list[ProductOut])
async def get_wishlist(
    token: Annotated[dict, Depends(get_current_token)],
    db: Annotated[Session, Depends(get_db)],
):
    from app.api.v1.routers.products import _product_to_out
    user_id = uuid.UUID(token["sub"])
    items = (
        db.query(WishlistItem)
        .options(
            selectinload(WishlistItem.product).selectinload(Product.images),
            selectinload(WishlistItem.product).selectinload(Product.inventory),
            selectinload(WishlistItem.product).selectinload(Product.variety_rel),
            selectinload(WishlistItem.product).selectinload(Product.region_rel),
        )
        .filter(WishlistItem.user_id == user_id)
        .all()
    )
    return [_product_to_out(i.product) for i in items if i.product and i.product.publication == "published"]


class WishlistAddIn(BaseModel):
    product_id: uuid.UUID


@router.post("/wishlist/items", status_code=201)
@router.post("/wishlist/items/{product_id}", status_code=201)
async def add_to_wishlist(
    token: Annotated[dict, Depends(get_current_token)],
    db: Annotated[Session, Depends(get_db)],
    product_id: uuid.UUID | None = None,
    body: WishlistAddIn | None = None,
):
    target_id = product_id or (body.product_id if body else None)
    if not target_id:
        raise HTTPException(status_code=422, detail="product_id is required.")
    user_id = uuid.UUID(token["sub"])
    product = db.query(Product).filter(Product.id == target_id, Product.publication == "published").first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    existing = db.query(WishlistItem).filter(
        WishlistItem.user_id == user_id, WishlistItem.product_id == target_id
    ).first()
    if not existing:
        db.add(WishlistItem(user_id=user_id, product_id=target_id))
        db.commit()
    return {"message": "Added to wishlist."}


@router.delete("/wishlist/items/{product_id}", status_code=204)
async def remove_from_wishlist(
    product_id: uuid.UUID,
    token: Annotated[dict, Depends(get_current_token)],
    db: Annotated[Session, Depends(get_db)],
):
    user_id = uuid.UUID(token["sub"])
    item = db.query(WishlistItem).filter(
        WishlistItem.user_id == user_id, WishlistItem.product_id == product_id
    ).first()
    if item:
        db.delete(item)
        db.commit()
    return None
