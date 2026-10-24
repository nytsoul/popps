"""Admin order management endpoints."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload

from app.core.permissions import require_role, UserRole
from app.db.session import get_db
from app.models.order import Order, OrderStatusEvent
from app.schemas.order import OrderOut

router = APIRouter()

VALID_TRANSITIONS: dict[str, list[str]] = {
    "pending_payment": ["confirmed", "cancelled"],
    "confirmed": ["processing", "cancelled"],
    "processing": ["packed", "cancelled"],
    "packed": ["shipped"],
    "shipped": ["delivered"],
    "delivered": ["return_requested"],
    "return_requested": ["returned", "cancelled"],
    "returned": ["refund_pending"],
    "refund_pending": ["refunded"],
    "cancelled": [],
    "refunded": [],
}

from app.api.v1.routers.orders import _order_to_out


@router.get("/admin/orders", response_model=list[OrderOut])
async def admin_list_orders(
    token: Annotated[dict, Depends(require_role(UserRole.SUPPORT))],
    db: Annotated[Session, Depends(get_db)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    status: str | None = Query(default=None),
):
    q = db.query(Order).options(selectinload(Order.items), selectinload(Order.status_events))
    if status:
        q = q.filter(Order.status == status)
    orders = q.order_by(Order.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return [_order_to_out(o) for o in orders]


@router.get("/admin/orders/{order_id}", response_model=OrderOut)
async def admin_get_order(
    order_id: uuid.UUID,
    token: Annotated[dict, Depends(require_role(UserRole.SUPPORT))],
    db: Annotated[Session, Depends(get_db)],
):
    order = db.query(Order).options(selectinload(Order.items), selectinload(Order.status_events)).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")
    return _order_to_out(order)


@router.patch("/admin/orders/{order_id}/status")
async def admin_update_order_status(
    order_id: uuid.UUID,
    new_status: str,
    note: str | None = None,
    token: Annotated[dict, Depends(require_role(UserRole.SUPPORT))] = ...,
    db: Annotated[Session, Depends(get_db)] = ...,
):
    actor_id = uuid.UUID(token["sub"])
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")
    allowed = VALID_TRANSITIONS.get(order.status, [])
    if new_status not in allowed:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot transition from '{order.status}' to '{new_status}'. Allowed: {allowed}",
        )
    order.status = new_status
    db.add(OrderStatusEvent(
        order_id=order.id,
        status=new_status,
        note=note or f"Status updated by staff.",
        created_at=datetime.now(timezone.utc),
        created_by_id=actor_id,
    ))
    db.commit()
    return {"status": new_status, "order_id": str(order_id)}
