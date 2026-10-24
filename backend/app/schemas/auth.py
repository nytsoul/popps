"""Pydantic v2 schemas for auth and user endpoints."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


# ── Registration / Login ────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit.")
        if not any(c.isalpha() for c in v):
            raise ValueError("Password must contain at least one letter.")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


# ── Token responses ──────────────────────────────────────────────────────────

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


# ── User ────────────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    role: str
    is_email_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=200)


# ── Address ─────────────────────────────────────────────────────────────────

class AddressIn(BaseModel):
    label: str = Field(default="Home", max_length=50)
    full_name: str = Field(min_length=1, max_length=200)
    line1: str = Field(min_length=1, max_length=255)
    line2: str | None = Field(default=None, max_length=255)
    city: str = Field(min_length=1, max_length=100)
    state: str = Field(min_length=1, max_length=100)
    pincode: str = Field(min_length=4, max_length=20)
    phone: str = Field(min_length=7, max_length=30)
    is_default: bool = False


class AddressOut(AddressIn):
    id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}
