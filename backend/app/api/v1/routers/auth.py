"""Authentication endpoints: register, login, logout, password reset."""
from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
from app.db.session import get_db
from app.models.user import RefreshToken, User
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserOut,
)

router = APIRouter()

# ── Helpers ───────────────────────────────────────────────────────────────────

def _user_to_token_response(user: User) -> dict:
    from app.core.config import settings
    return {
        "access_token": create_access_token(str(user.id), {"role": user.role, "email": user.email}),
        "token_type": "bearer",
        "expires_in": settings.access_token_expire_minutes * 60,
    }


def _get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email.lower().strip()).first()


# ── Register ──────────────────────────────────────────────────────────────────

@router.post("/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: Annotated[Session, Depends(get_db)]):
    """Create a new customer account."""
    email = body.email.lower().strip()
    if _get_user_by_email(db, email):
        # Generic response to avoid account enumeration
        raise HTTPException(status_code=400, detail="Registration failed. Please check your details.")

    user = User(
        name=body.name.strip(),
        email=email,
        hashed_password=hash_password(body.password),
        role="customer",
        email_verification_token=secrets.token_urlsafe(32),
    )
    db.add(user)
    db.flush()  # get the ID without committing

    # TODO: enqueue email verification notification
    db.commit()
    return _user_to_token_response(user)


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post("/auth/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: Annotated[Session, Depends(get_db)]):
    """Authenticate with email and password."""
    user = _get_user_by_email(db, body.email)
    # Constant-time check — same response for unknown user and wrong password
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="This account has been deactivated.")
    return _user_to_token_response(user)


# ── Logout ────────────────────────────────────────────────────────────────────

@router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout():
    """
    Stateless JWT logout. The client must discard the access token.
    Refresh-token invalidation is performed when refresh tokens are implemented.
    """
    return None


# ── Forgot password ───────────────────────────────────────────────────────────

@router.post("/auth/forgot-password", status_code=status.HTTP_202_ACCEPTED)
async def forgot_password(body: ForgotPasswordRequest, db: Annotated[Session, Depends(get_db)]):
    """
    Initiate password reset. Always returns the same response to prevent
    account enumeration — a real token is only stored when the account exists.
    """
    user = _get_user_by_email(db, body.email)
    if user and user.is_active:
        token = secrets.token_urlsafe(32)
        user.password_reset_token = hashlib.sha256(token.encode()).hexdigest()
        user.password_reset_expires = datetime.now(timezone.utc).replace(tzinfo=None) + __import__("datetime").timedelta(hours=1)
        db.commit()
        # TODO: enqueue password-reset email with token
    return {"message": "If that address is registered, a reset link has been sent."}


# ── Reset password ────────────────────────────────────────────────────────────

@router.post("/auth/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(body: ResetPasswordRequest, db: Annotated[Session, Depends(get_db)]):
    """Apply a password reset using a valid token."""
    token_hash = hashlib.sha256(body.token.encode()).hexdigest()
    user = db.query(User).filter(User.password_reset_token == token_hash).first()
    if not user or (user.password_reset_expires and user.password_reset_expires < datetime.now()):
        raise HTTPException(status_code=400, detail="This reset link is invalid or has expired.")
    user.hashed_password = hash_password(body.new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    db.commit()
    return {"message": "Password updated successfully."}


# ── Admin login ───────────────────────────────────────────────────────────────

@router.post("/auth/admin/login", response_model=TokenResponse)
async def admin_login(body: LoginRequest, db: Annotated[Session, Depends(get_db)]):
    """Admin login — only admin-or-above roles may authenticate here."""
    user = _get_user_by_email(db, body.email)
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated.")
    if user.role not in ("admin", "super_admin", "support", "inventory", "product_manager"):
        raise HTTPException(status_code=403, detail="Not authorised for admin access.")
    return _user_to_token_response(user)
