"""Admin inventory management endpoints."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload

from app.core.permissions import require_role, UserRole
from app.db.session import get_db
from app.models.product import Inventory, InventoryMovement, Product
from app.schemas.order import InventoryAdjustIn, InventoryOut

router = APIRouter()


def _inv_to_out(inv: Inventory) -> dict:
    p = inv.product
    return {
        "product_id": inv.product_id,
        "product_name": p.name if p else "Unknown",
        "product_sku": p.sku if p else "",
        "quantity_available": inv.quantity_available,
        "quantity_reserved": inv.quantity_reserved,
        "quantity_committed": inv.quantity_committed,
        "low_stock_threshold": inv.low_stock_threshold,
        "updated_at": inv.updated_at,
    }


@router.get("/admin/inventory")
async def admin_list_inventory(
    token: Annotated[dict, Depends(require_role(UserRole.INVENTORY))],
    db: Annotated[Session, Depends(get_db)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, ge=1, le=500),
    low_stock: bool = Query(default=False),
):
    q = db.query(Inventory).options(selectinload(Inventory.product))
    if low_stock:
        q = q.filter(Inventory.quantity_available <= Inventory.low_stock_threshold)
    inventories = q.offset((page - 1) * page_size).limit(page_size).all()
    return [_inv_to_out(i) for i in inventories]


@router.post("/admin/inventory/adjustments")
async def admin_adjust_inventory(
    body: InventoryAdjustIn,
    token: Annotated[dict, Depends(require_role(UserRole.INVENTORY))],
    db: Annotated[Session, Depends(get_db)],
):
    actor_id = uuid.UUID(token["sub"])
    inv = db.query(Inventory).filter(Inventory.product_id == body.product_id).with_for_update().first()
    if not inv:
        raise HTTPException(status_code=404, detail="Inventory record not found.")

    new_qty = inv.quantity_available + body.delta
    if new_qty < 0:
        raise HTTPException(status_code=409, detail=f"Cannot reduce stock below 0. Current: {inv.quantity_available}, Delta: {body.delta}.")

    inv.quantity_available = new_qty
    db.add(InventoryMovement(
        inventory_id=inv.id,
        delta=body.delta,
        reason=body.reason,
        note=body.note,
        created_by_id=actor_id,
        created_at=datetime.now(timezone.utc),
    ))
    db.commit()
    return _inv_to_out(inv)


@router.get("/admin/inventory/{product_id}/movements")
async def admin_inventory_movements(
    product_id: uuid.UUID,
    token: Annotated[dict, Depends(require_role(UserRole.INVENTORY))],
    db: Annotated[Session, Depends(get_db)],
    limit: int = Query(default=50, ge=1, le=200),
):
    inv = db.query(Inventory).filter(Inventory.product_id == product_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Inventory not found.")
    movements = (
        db.query(InventoryMovement)
        .filter(InventoryMovement.inventory_id == inv.id)
        .order_by(InventoryMovement.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": str(m.id), "delta": m.delta, "reason": m.reason,
            "note": m.note, "created_at": m.created_at.isoformat(),
        }
        for m in movements
    ]
