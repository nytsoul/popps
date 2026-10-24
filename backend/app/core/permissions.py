"""Role-based access control dependencies for FastAPI."""
from __future__ import annotations

from enum import StrEnum
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db

bearer = HTTPBearer(auto_error=False)


class UserRole(StrEnum):
    CUSTOMER = "customer"
    SUPPORT = "support"
    INVENTORY = "inventory"
    PRODUCT_MANAGER = "product_manager"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"


# Role hierarchy: higher index = more privileged
ROLE_HIERARCHY = [
    UserRole.CUSTOMER,
    UserRole.SUPPORT,
    UserRole.INVENTORY,
    UserRole.PRODUCT_MANAGER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
]


def role_level(role: str) -> int:
    try:
        return ROLE_HIERARCHY.index(UserRole(role))
    except (ValueError, KeyError):
        return -1


def get_current_token(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> dict:
    """Decode and return the JWT payload. Raises 401 if missing or invalid."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        return decode_access_token(credentials.credentials)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )


def require_role(minimum_role: UserRole):
    """Dependency factory: returns a dependency that enforces a minimum role."""

    def dependency(token: Annotated[dict, Depends(get_current_token)]) -> dict:
        user_role = token.get("role", "customer")
        if role_level(user_role) < role_level(minimum_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )
        return token

    return dependency


# Convenience dependency aliases
require_auth = Depends(get_current_token)
require_customer = Depends(require_role(UserRole.CUSTOMER))
require_support = Depends(require_role(UserRole.SUPPORT))
require_inventory = Depends(require_role(UserRole.INVENTORY))
require_product_manager = Depends(require_role(UserRole.PRODUCT_MANAGER))
require_admin = Depends(require_role(UserRole.ADMIN))
require_super_admin = Depends(require_role(UserRole.SUPER_ADMIN))
