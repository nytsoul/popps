"""User profile and address management endpoints."""
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.permissions import get_current_token
from app.db.session import get_db
from app.models.user import Address, User
from app.schemas.auth import AddressIn, AddressOut, UserOut, UserUpdate, ChangePasswordRequest
from app.core.security import hash_password, verify_password

router = APIRouter()


def _get_user(token: dict, db: Session) -> User:
    user = db.query(User).filter(User.id == uuid.UUID(token["sub"])).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found.")
    return user


# ── Profile ───────────────────────────────────────────────────────────────────

@router.get("/users/me", response_model=UserOut)
async def get_me(
    token: Annotated[dict, Depends(get_current_token)],
    db: Annotated[Session, Depends(get_db)],
):
    return _get_user(token, db)


@router.patch("/users/me", response_model=UserOut)
async def update_me(
    body: UserUpdate,
    token: Annotated[dict, Depends(get_current_token)],
    db: Annotated[Session, Depends(get_db)],
):
    user = _get_user(token, db)
    if body.name is not None:
        user.name = body.name.strip()
    db.commit()
    return user


@router.post("/users/me/change-password", status_code=204)
async def change_password(
    body: ChangePasswordRequest,
    token: Annotated[dict, Depends(get_current_token)],
    db: Annotated[Session, Depends(get_db)],
):
    user = _get_user(token, db)
    if not verify_password(body.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    user.hashed_password = hash_password(body.new_password)
    db.commit()
    return None


# ── Addresses ─────────────────────────────────────────────────────────────────

@router.get("/users/me/addresses", response_model=list[AddressOut])
async def list_addresses(
    token: Annotated[dict, Depends(get_current_token)],
    db: Annotated[Session, Depends(get_db)],
):
    user = _get_user(token, db)
    return user.addresses


@router.post("/users/me/addresses", response_model=AddressOut, status_code=201)
async def add_address(
    body: AddressIn,
    token: Annotated[dict, Depends(get_current_token)],
    db: Annotated[Session, Depends(get_db)],
):
    user = _get_user(token, db)
    if body.is_default:
        for a in user.addresses:
            a.is_default = False
    addr = Address(user_id=user.id, **body.model_dump())
    db.add(addr)
    db.commit()
    db.refresh(addr)
    return addr


@router.patch("/users/me/addresses/{address_id}", response_model=AddressOut)
async def update_address(
    address_id: uuid.UUID,
    body: AddressIn,
    token: Annotated[dict, Depends(get_current_token)],
    db: Annotated[Session, Depends(get_db)],
):
    user = _get_user(token, db)
    addr = db.query(Address).filter(Address.id == address_id, Address.user_id == user.id).first()
    if not addr:
        raise HTTPException(status_code=404, detail="Address not found.")
    if body.is_default:
        for a in user.addresses:
            a.is_default = False
    for k, v in body.model_dump().items():
        setattr(addr, k, v)
    db.commit()
    db.refresh(addr)
    return addr


@router.delete("/users/me/addresses/{address_id}", status_code=204)
async def delete_address(
    address_id: uuid.UUID,
    token: Annotated[dict, Depends(get_current_token)],
    db: Annotated[Session, Depends(get_db)],
):
    user = _get_user(token, db)
    addr = db.query(Address).filter(Address.id == address_id, Address.user_id == user.id).first()
    if not addr:
        raise HTTPException(status_code=404, detail="Address not found.")
    db.delete(addr)
    db.commit()
    return None
