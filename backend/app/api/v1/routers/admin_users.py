"""Admin user management endpoints."""
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.permissions import require_role, UserRole
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import UserOut

router = APIRouter()


@router.get("/admin/customers", response_model=list[UserOut])
async def admin_list_customers(
    token: Annotated[dict, Depends(require_role(UserRole.SUPPORT))],
    db: Annotated[Session, Depends(get_db)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    q: str | None = Query(default=None),
):
    query = db.query(User).filter(User.role == "customer")
    if q:
        query = query.filter(User.email.ilike(f"%{q}%") | User.name.ilike(f"%{q}%"))
    return query.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()


@router.get("/admin/customers/{user_id}", response_model=UserOut)
async def admin_get_customer(
    user_id: uuid.UUID,
    token: Annotated[dict, Depends(require_role(UserRole.SUPPORT))],
    db: Annotated[Session, Depends(get_db)],
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return user


@router.patch("/admin/customers/{user_id}/deactivate", status_code=200)
async def admin_deactivate_customer(
    user_id: uuid.UUID,
    token: Annotated[dict, Depends(require_role(UserRole.ADMIN))],
    db: Annotated[Session, Depends(get_db)],
):
    actor_id = uuid.UUID(token["sub"])
    if actor_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account.")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    user.is_active = False
    db.commit()
    return {"message": "Account deactivated."}


@router.get("/admin/staff", response_model=list[UserOut])
async def admin_list_staff(
    token: Annotated[dict, Depends(require_role(UserRole.SUPER_ADMIN))],
    db: Annotated[Session, Depends(get_db)],
):
    return db.query(User).filter(User.role != "customer").order_by(User.created_at.desc()).all()
