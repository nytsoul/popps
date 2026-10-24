"""Order endpoints: checkout validation, order creation, history, tracking, cancellation."""
from __future__ import annotations

import random
import string
import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Header
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session, selectinload

from app.core.permissions import bearer, get_current_token
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.order import (
    Cart, CartItem, Coupon, CouponRedemption,
    Order, OrderItem, OrderStatusEvent, ReturnRequest,
)
from app.models.product import Inventory as ProductInventory, Product
from app.schemas.order import (
    CheckoutValidateRequest, CheckoutValidateResponse,
    CreateOrderRequest, OrderOut, OrderItemOut, OrderStatusEventOut,
    ReturnRequestIn, ReturnRequestOut,
)

router = APIRouter()
PAISE = 100
SHIPPING_THRESHOLD_PAISE = 99900  # Free shipping above ₹999
SHIPPING_PAISE = 9900  # ₹99 shipping


def _gen_reference() -> str:
    suffix = "".join(random.choices(string.digits, k=5))
    return f"SS-{datetime.now().year}-{suffix}"


def _order_to_out(order: Order) -> OrderOut:
    addr_dict = {
        "fullName": order.customer_name,
        "full_name": order.customer_name,
        "line1": order.address_line1,
        "line2": order.address_line2,
        "city": order.address_city,
        "state": order.address_state,
        "pincode": order.address_pincode,
        "phone": order.address_phone,
    }
    items_out = [
        OrderItemOut(
            product_id=i.product_id,
            productId=str(i.product_id) if i.product_id else None,
            product_name=i.product_name,
            name=i.product_name,
            product_sku=i.product_sku,
            color_variant=i.color_variant,
            color=i.color_variant,
            quantity=i.quantity,
            unit_price=i.unit_price_paise / PAISE,
            price=i.unit_price_paise / PAISE,
            total_price=i.total_paise / PAISE,
            image_url=i.image_url,
            image=i.image_url,
        )
        for i in order.items
    ]
    events_out = [
        OrderStatusEventOut(
            status=e.status,
            note=e.note,
            created_at=e.created_at,
            at=e.created_at.isoformat() if e.created_at else None,
        )
        for e in (order.status_events or [])
    ]
    if not events_out:
        events_out = [
            OrderStatusEventOut(
                status=order.status,
                note="Order placed successfully",
                created_at=order.created_at,
                at=order.created_at.isoformat() if order.created_at else None,
            )
        ]

    return OrderOut(
        id=order.id,
        reference=order.reference,
        customer_email=order.customer_email,
        email=order.customer_email,
        customer_name=order.customer_name,
        address_line1=order.address_line1,
        address_line2=order.address_line2,
        address_city=order.address_city,
        address_state=order.address_state,
        address_pincode=order.address_pincode,
        address_phone=order.address_phone,
        address=addr_dict,
        items=items_out,
        subtotal=order.subtotal_paise / PAISE,
        shipping=order.shipping_paise / PAISE,
        discount=order.discount_paise / PAISE,
        tax=order.tax_paise / PAISE,
        total=order.total_paise / PAISE,
        coupon_code=order.coupon_code,
        status=order.status,
        gift_wrap=order.gift_wrap,
        gift={"wrap": order.gift_wrap, "message": order.gift_message} if order.gift_wrap else None,
        gift_message=order.gift_message,
        is_mock=order.is_mock,
        mock=order.is_mock,
        created_at=order.created_at,
        createdAt=order.created_at.isoformat() if order.created_at else None,
        status_events=events_out,
        events=[{"status": e.status, "at": e.at or e.created_at.isoformat(), "note": e.note or ""} for e in events_out],
    )


# ── Checkout validate ─────────────────────────────────────────────────────────

@router.post("/checkout/validate", response_model=CheckoutValidateResponse)
async def validate_checkout(
    body: CheckoutValidateRequest,
    db: Annotated[Session, Depends(get_db)],
):
    """Validate cart contents, apply coupon, return price summary."""
    cart = db.query(Cart).options(
        selectinload(Cart.items).selectinload(CartItem.product).selectinload(Product.images),
        selectinload(Cart.items).selectinload(CartItem.product).selectinload(Product.inventory),
    ).filter(Cart.id == body.cart_id).first() if body.cart_id else None

    if not cart or not cart.items:
        raise HTTPException(status_code=400, detail="Cart is empty.")

    warnings = []
    item_outs = []
    subtotal_paise = 0

    for ci in cart.items:
        p = ci.product
        if not p or p.publication != "published":
            warnings.append(f"{ci.product_id} is no longer available.")
            continue
        inv = p.inventory
        available = inv.quantity_available if inv else 0
        if available < ci.quantity:
            warnings.append(f"Only {available} of {p.name} available (you have {ci.quantity} in cart).")
        item_outs.append({
            "id": ci.id, "product_id": p.id, "product_name": p.name, "product_slug": p.slug,
            "image_url": (sorted(p.images, key=lambda i: i.sort_order)[0].url if p.images else None),
            "color_variant": ci.color_variant, "quantity": min(ci.quantity, max(available, 0)),
            "unit_price": p.price_paise / PAISE, "total_price": (p.price_paise * min(ci.quantity, max(available, 0))) / PAISE,
            "stock_available": available,
        })
        subtotal_paise += p.price_paise * min(ci.quantity, max(available, 0))

    shipping_paise = 0 if subtotal_paise >= SHIPPING_THRESHOLD_PAISE else SHIPPING_PAISE
    discount_paise = 0

    if body.coupon_code:
        coupon = db.query(Coupon).filter(
            Coupon.code == body.coupon_code.upper(),
            Coupon.is_active == True,  # noqa: E712
        ).first()
        if coupon and subtotal_paise >= coupon.min_cart_paise:
            if coupon.discount_type == "percentage":
                discount_paise = int(subtotal_paise * coupon.discount_value / 10000)
                if coupon.max_discount_paise:
                    discount_paise = min(discount_paise, coupon.max_discount_paise)
            else:
                discount_paise = coupon.discount_value
        elif coupon:
            warnings.append(f"Coupon requires minimum cart of ₹{coupon.min_cart_paise / PAISE:.0f}.")
        else:
            warnings.append("Invalid or expired coupon code.")

    total_paise = max(0, subtotal_paise + shipping_paise - discount_paise)

    from app.schemas.order import CartItemOut
    return CheckoutValidateResponse(
        subtotal=subtotal_paise / PAISE,
        shipping=shipping_paise / PAISE,
        discount=discount_paise / PAISE,
        tax=0.0,
        total=total_paise / PAISE,
        coupon_applied=discount_paise > 0,
        items=[CartItemOut(**i) for i in item_outs],
        warnings=warnings,
    )


# ── Create order ──────────────────────────────────────────────────────────────

@router.post("/orders", response_model=OrderOut, status_code=201)
async def create_order(
    body: CreateOrderRequest,
    db: Annotated[Session, Depends(get_db)],
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)] = None,
):
    user_id = None
    if credentials:
        try:
            tok = decode_access_token(credentials.credentials)
            user_id = uuid.UUID(tok["sub"])
        except Exception:
            pass

    key = idempotency_key or body.idempotency_key or str(uuid.uuid4())
    # Idempotency check
    existing = db.query(Order).filter(Order.idempotency_key == key).first()
    if existing:
        return _order_to_out(existing)

    order_items = []
    subtotal_paise = 0

    if body.items:
        for it in body.items:
            pid = it.product_id
            if not pid and it.productId:
                try:
                    pid = uuid.UUID(it.productId)
                except ValueError:
                    p_by_slug = db.query(Product).filter(Product.slug == it.productId).first()
                    pid = p_by_slug.id if p_by_slug else None

            p = db.query(Product).options(
                selectinload(Product.images),
                selectinload(Product.inventory),
            ).filter(Product.id == pid).first() if pid else None

            if not p:
                continue

            qty = it.quantity or 1
            images = sorted(p.images or [], key=lambda i: i.sort_order)
            unit_paise = p.price_paise
            order_items.append(OrderItem(
                product_id=p.id,
                product_name=p.name,
                product_sku=p.sku,
                color_variant=it.color_variant or it.color,
                quantity=qty,
                unit_price_paise=unit_paise,
                total_paise=unit_paise * qty,
                image_url=images[0].url if images else None,
            ))
            subtotal_paise += unit_paise * qty

    elif body.cart_id:
        cart = db.query(Cart).options(
            selectinload(Cart.items).selectinload(CartItem.product).selectinload(Product.images),
            selectinload(Cart.items).selectinload(CartItem.product).selectinload(Product.inventory),
        ).filter(Cart.id == body.cart_id).first()

        if not cart or not cart.items:
            raise HTTPException(status_code=400, detail="Cart is empty.")

        for ci in cart.items:
            p = ci.product
            if not p or p.publication != "published":
                raise HTTPException(status_code=409, detail=f"Product {ci.product_id} is no longer available.")
            inv = p.inventory
            if not inv or inv.quantity_available < ci.quantity:
                raise HTTPException(status_code=409, detail=f"Insufficient stock for {p.name}.")

            images = sorted(p.images or [], key=lambda i: i.sort_order)
            order_items.append(OrderItem(
                product_id=p.id,
                product_name=p.name,
                product_sku=p.sku,
                color_variant=ci.color_variant,
                quantity=ci.quantity,
                unit_price_paise=p.price_paise,
                total_paise=p.price_paise * ci.quantity,
                image_url=images[0].url if images else None,
            ))
            subtotal_paise += p.price_paise * ci.quantity

    if not order_items:
        raise HTTPException(status_code=400, detail="Order must contain at least one valid item.")

    shipping_paise = 0 if subtotal_paise >= SHIPPING_THRESHOLD_PAISE else SHIPPING_PAISE
    discount_paise = 0
    total_paise = max(0, subtotal_paise + shipping_paise - discount_paise)

    # Extract address fields
    addr = body.address
    addr_dict = addr if isinstance(addr, dict) else (addr.model_dump() if addr else {})
    c_name = body.customer_name or addr_dict.get("fullName") or addr_dict.get("full_name") or "Valued Customer"
    c_email = body.customer_email or body.email or addr_dict.get("email") or "customer@shopscale.dev"
    g_wrap = body.gift_wrap or (body.gift.get("wrap", False) if body.gift else False)
    g_msg = body.gift_message or (body.gift.get("message") if body.gift else None)

    order = Order(
        reference=_gen_reference(),
        idempotency_key=key,
        user_id=user_id,
        customer_email=c_email,
        customer_name=c_name,
        address_line1=addr_dict.get("line1", "Standard Delivery Address"),
        address_line2=addr_dict.get("line2"),
        address_city=addr_dict.get("city", "Mumbai"),
        address_state=addr_dict.get("state", "Maharashtra"),
        address_pincode=addr_dict.get("pincode", "400001"),
        address_phone=addr_dict.get("phone", "+91 9999999999"),
        subtotal_paise=subtotal_paise,
        shipping_paise=shipping_paise,
        discount_paise=discount_paise,
        tax_paise=0,
        total_paise=total_paise,
        gift_wrap=g_wrap,
        gift_message=g_msg,
        status="placed",
    )
    db.add(order)
    db.flush()

    for oi in order_items:
        oi.order_id = order.id
        db.add(oi)

    now = datetime.now(timezone.utc)
    db.add(OrderStatusEvent(
        order_id=order.id,
        status="placed",
        note="Order placed successfully.",
        created_at=now,
    ))

    # Delete cart items after order creation if cart was used
    if 'cart' in locals() and cart and cart.items:
        for ci in cart.items:
            db.delete(ci)

    db.commit()
    db.refresh(order)
    return _order_to_out(order)


# ── Order history ─────────────────────────────────────────────────────────────

@router.get("/orders", response_model=list[OrderOut])
async def list_orders(
    token: Annotated[dict, Depends(get_current_token)],
    db: Annotated[Session, Depends(get_db)],
):
    user_id = uuid.UUID(token["sub"])
    orders = (
        db.query(Order)
        .options(selectinload(Order.items), selectinload(Order.status_events))
        .filter(Order.user_id == user_id)
        .order_by(Order.created_at.desc())
        .all()
    )
    return [_order_to_out(o) for o in orders]


@router.get("/orders/{ref_or_id}", response_model=OrderOut)
async def get_order(
    ref_or_id: str,
    db: Annotated[Session, Depends(get_db)],
    email: str | None = None,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)] = None,
):
    uuid_val = None
    try:
        uuid_val = uuid.UUID(ref_or_id)
    except ValueError:
        pass

    q = db.query(Order).options(selectinload(Order.items), selectinload(Order.status_events))
    if uuid_val:
        order = q.filter((Order.id == uuid_val) | (Order.reference == ref_or_id)).first()
    else:
        order = q.filter(Order.reference.ilike(ref_or_id)).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    if email:
        if order.customer_email.lower().strip() != email.lower().strip():
            raise HTTPException(status_code=404, detail="Order not found.")
        return _order_to_out(order)

    if credentials:
        try:
            tok = decode_access_token(credentials.credentials)
            uid = uuid.UUID(tok["sub"])
            user_role = tok.get("role", "customer")
            if user_role in ("admin", "super_admin", "support") or order.user_id == uid or order.customer_email.lower() == tok.get("email", "").lower():
                return _order_to_out(order)
        except Exception:
            pass

    return _order_to_out(order)


@router.post("/orders/{order_id}/cancel", status_code=200)
async def cancel_order(
    order_id: uuid.UUID,
    token: Annotated[dict, Depends(get_current_token)],
    db: Annotated[Session, Depends(get_db)],
):
    user_id = uuid.UUID(token["sub"])
    order = db.query(Order).options(selectinload(Order.status_events)).filter(
        Order.id == order_id, Order.user_id == user_id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")
    if order.status not in ("pending_payment", "confirmed"):
        raise HTTPException(status_code=409, detail="This order cannot be cancelled at its current stage.")
    order.status = "cancelled"
    order.cancelled_at = datetime.now(timezone.utc)
    db.add(OrderStatusEvent(order_id=order.id, status="cancelled", note="Cancelled by customer."))
    db.commit()
    return {"message": "Order cancelled."}


@router.post("/orders/{order_id}/returns", response_model=ReturnRequestOut, status_code=201)
async def create_return(
    order_id: uuid.UUID,
    body: ReturnRequestIn,
    token: Annotated[dict, Depends(get_current_token)],
    db: Annotated[Session, Depends(get_db)],
):
    user_id = uuid.UUID(token["sub"])
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == user_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")
    if order.status != "delivered":
        raise HTTPException(status_code=409, detail="Returns can only be requested for delivered orders.")
    rr = ReturnRequest(
        order_id=order.id,
        user_id=user_id,
        reason=body.reason,
        details=body.details,
        status="requested",
    )
    db.add(rr)
    db.commit()
    db.refresh(rr)
    return rr
