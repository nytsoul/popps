"""Cart endpoints: guest and authenticated cart management."""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from sqlalchemy.orm import Session, selectinload

from app.core.permissions import get_current_token
from app.db.session import get_db
from app.models.order import Cart, CartItem
from app.models.product import Inventory, Product
from app.schemas.order import CartItemIn, CartItemOut, CartOut

router = APIRouter()
PAISE = 100


def _get_or_create_cart(
    db: Session,
    user_id: uuid.UUID | None = None,
    session_id: str | None = None,
) -> Cart:
    """Retrieve existing cart or create a new one for the given owner."""
    q = db.query(Cart).options(
        selectinload(Cart.items).selectinload(CartItem.product).selectinload(Product.images),
        selectinload(Cart.items).selectinload(CartItem.product).selectinload(Product.inventory),
    )
    if user_id:
        cart = q.filter(Cart.user_id == user_id).first()
    else:
        cart = q.filter(Cart.session_id == session_id).first()

    if not cart:
        cart = Cart(
            user_id=user_id,
            session_id=session_id if not user_id else None,
            expires_at=datetime.now(timezone.utc) + timedelta(days=14),
        )
        db.add(cart)
        db.flush()

    return cart


def _item_to_out(item: CartItem) -> CartItemOut:
    p = item.product
    images = sorted(p.images or [], key=lambda i: i.sort_order)
    inv = p.inventory
    return CartItemOut(
        id=item.id,
        product_id=item.product_id,
        product_name=p.name,
        product_slug=p.slug,
        image_url=images[0].url if images else None,
        color_variant=item.color_variant,
        quantity=item.quantity,
        unit_price=p.price_paise / PAISE,
        total_price=(p.price_paise * item.quantity) / PAISE,
        stock_available=inv.quantity_available if inv else 0,
    )


def _cart_to_out(cart: Cart) -> CartOut:
    item_outs = [_item_to_out(i) for i in cart.items]
    subtotal = sum(i.total_price for i in item_outs)
    return CartOut(
        id=cart.id,
        items=item_outs,
        subtotal=subtotal,
        item_count=sum(i.quantity for i in item_outs),
    )


def _get_owner(
    token: dict | None,
    session_id: str | None,
) -> tuple[uuid.UUID | None, str | None]:
    if token:
        return uuid.UUID(token["sub"]), None
    if session_id:
        return None, session_id
    return None, str(uuid.uuid4())


@router.get("/cart", response_model=CartOut)
async def get_cart(
    db: Annotated[Session, Depends(get_db)],
    response: Response,
    token: Annotated[dict | None, Depends(lambda: None)] = None,
    shopscale_session: Annotated[str | None, Cookie()] = None,
):
    # Try auth token
    from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
    from fastapi import Request
    user_id = None
    if token:
        try:
            user_id = uuid.UUID(token["sub"])
        except Exception:
            pass

    user_id_val, session_id = _get_owner(None, shopscale_session)
    if not session_id:
        session_id = str(uuid.uuid4())
        response.set_cookie("shopscale_session", session_id, max_age=3600 * 24 * 14, httponly=True, samesite="lax")

    cart = _get_or_create_cart(db, user_id=user_id_val, session_id=session_id)
    db.commit()
    return _cart_to_out(cart)


@router.post("/cart/items", response_model=CartOut, status_code=201)
async def add_to_cart(
    body: CartItemIn,
    db: Annotated[Session, Depends(get_db)],
    response: Response,
    shopscale_session: Annotated[str | None, Cookie()] = None,
):
    session_id = shopscale_session or str(uuid.uuid4())
    if not shopscale_session:
        response.set_cookie("shopscale_session", session_id, max_age=3600 * 24 * 14, httponly=True, samesite="lax")

    product = (
        db.query(Product)
        .options(selectinload(Product.inventory))
        .filter(Product.id == body.product_id, Product.publication == "published", Product.deleted_at.is_(None))
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found or unavailable.")

    inv = product.inventory
    available = inv.quantity_available if inv else 0
    if available <= 0:
        raise HTTPException(status_code=409, detail=f"{product.name} is out of stock.")

    cart = _get_or_create_cart(db, session_id=session_id)
    existing = next(
        (i for i in cart.items if i.product_id == body.product_id and i.color_variant == body.color_variant), None
    )
    if existing:
        new_qty = existing.quantity + body.quantity
        if new_qty > available:
            raise HTTPException(status_code=409, detail=f"Only {available} available.")
        existing.quantity = new_qty
    else:
        if body.quantity > available:
            raise HTTPException(status_code=409, detail=f"Only {available} available.")
        item = CartItem(
            cart_id=cart.id,
            product_id=product.id,
            color_variant=body.color_variant,
            quantity=body.quantity,
            unit_price_paise=product.price_paise,
        )
        db.add(item)

    db.commit()
    db.refresh(cart)
    return _cart_to_out(cart)


@router.patch("/cart/items/{item_id}", response_model=CartOut)
async def update_cart_item(
    item_id: uuid.UUID,
    body: CartItemIn,
    db: Annotated[Session, Depends(get_db)],
    shopscale_session: Annotated[str | None, Cookie()] = None,
):
    cart_item = db.query(CartItem).filter(CartItem.id == item_id).first()
    if not cart_item:
        raise HTTPException(status_code=404, detail="Cart item not found.")

    product = db.query(Product).options(selectinload(Product.inventory)).filter(Product.id == cart_item.product_id).first()
    inv = product.inventory if product else None
    available = inv.quantity_available if inv else 0

    if body.quantity == 0:
        db.delete(cart_item)
    else:
        if body.quantity > available:
            raise HTTPException(status_code=409, detail=f"Only {available} available.")
        cart_item.quantity = body.quantity

    db.commit()
    cart = db.query(Cart).options(
        selectinload(Cart.items).selectinload(CartItem.product).selectinload(Product.images),
        selectinload(Cart.items).selectinload(CartItem.product).selectinload(Product.inventory),
    ).filter(Cart.id == cart_item.cart_id).first()
    return _cart_to_out(cart)


@router.delete("/cart/items/{item_id}", status_code=204)
async def remove_cart_item(
    item_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
):
    item = db.query(CartItem).filter(CartItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found.")
    db.delete(item)
    db.commit()
    return None
