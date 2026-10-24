"""Pydantic schemas for cart, orders, checkout, payments."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


# ── Cart ─────────────────────────────────────────────────────────────────────

class CartItemIn(BaseModel):
    product_id: uuid.UUID
    color_variant: str | None = None
    quantity: int = Field(default=1, ge=1, le=50)


class CartItemOut(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    product_name: str
    product_slug: str
    image_url: str | None
    color_variant: str | None
    quantity: int
    unit_price: float   # in rupees
    total_price: float
    stock_available: int
    model_config = {"from_attributes": True}


class CartOut(BaseModel):
    id: uuid.UUID
    items: list[CartItemOut]
    subtotal: float
    item_count: int


# ── Checkout / Order ──────────────────────────────────────────────────────────

class AddressSnapshot(BaseModel):
    fullName: str | None = None
    full_name: str | None = None
    line1: str = ""
    line2: str | None = None
    city: str = ""
    state: str = ""
    pincode: str = ""
    phone: str = ""

    def get_name(self) -> str:
        return self.fullName or self.full_name or "Guest Customer"


class CheckoutValidateRequest(BaseModel):
    cart_id: uuid.UUID | None = None  # if None, use current user/session cart
    address: AddressSnapshot | dict | None = None
    coupon_code: str | None = None


class CheckoutValidateResponse(BaseModel):
    subtotal: float
    shipping: float
    discount: float
    tax: float
    total: float
    coupon_applied: bool
    items: list[CartItemOut]
    warnings: list[str] = []  # e.g. "Item X is now out of stock"


class CreateOrderItemIn(BaseModel):
    product_id: uuid.UUID | None = None
    productId: str | None = None
    quantity: int = 1
    color_variant: str | None = None
    color: str | None = None
    name: str | None = None
    price: float | None = None
    image: str | None = None


class CreateOrderRequest(BaseModel):
    cart_id: uuid.UUID | None = None
    address: AddressSnapshot | dict | None = None
    items: list[CreateOrderItemIn] | None = None
    email: str | None = None
    customer_email: str | None = None
    customer_name: str | None = None
    coupon_code: str | None = None
    gift_wrap: bool = False
    gift_message: str | None = None
    gift: dict | None = None
    idempotency_key: str | None = None


class OrderItemOut(BaseModel):
    product_id: uuid.UUID | None = None
    productId: str | None = None
    product_name: str = ""
    name: str | None = None
    product_sku: str = ""
    color_variant: str | None = None
    color: str | None = None
    quantity: int = 1
    unit_price: float = 0.0
    price: float | None = None
    total_price: float = 0.0
    image_url: str | None = None
    image: str | None = None
    model_config = {"from_attributes": True}


class OrderStatusEventOut(BaseModel):
    status: str
    note: str | None = None
    created_at: datetime
    at: str | None = None
    model_config = {"from_attributes": True}


class OrderOut(BaseModel):
    id: uuid.UUID
    reference: str
    customer_email: str = ""
    email: str | None = None
    customer_name: str = ""
    address_line1: str = ""
    address_line2: str | None = None
    address_city: str = ""
    address_state: str = ""
    address_pincode: str = ""
    address_phone: str = ""
    address: dict | None = None
    items: list[OrderItemOut] = []
    subtotal: float = 0.0
    shipping: float = 0.0
    discount: float = 0.0
    tax: float = 0.0
    total: float = 0.0
    coupon_code: str | None = None
    status: str = "placed"
    gift_wrap: bool = False
    gift: dict | None = None
    gift_message: str | None = None
    is_mock: bool = False
    mock: bool = False
    created_at: datetime
    createdAt: str | None = None
    status_events: list[OrderStatusEventOut] = []
    events: list[dict] = []
    model_config = {"from_attributes": True}


# ── Payment ───────────────────────────────────────────────────────────────────

class CreatePaymentRequest(BaseModel):
    order_id: uuid.UUID


class CreatePaymentResponse(BaseModel):
    payment_id: uuid.UUID
    provider: str
    provider_order_id: str | None
    amount: float
    currency: str
    # For Razorpay: key_id is sent; secret is never sent to client
    razorpay_key_id: str | None = None
    # For mock: proceed immediately
    mock: bool = False


class PaymentWebhookRequest(BaseModel):
    provider: str
    payload: dict  # raw provider payload — verified server-side


# ── Coupon ────────────────────────────────────────────────────────────────────

class CouponIn(BaseModel):
    code: str = Field(min_length=3, max_length=50)
    discount_type: str  # percentage | fixed
    discount_value: float = Field(gt=0)  # % or rupees
    min_cart: float = Field(default=0, ge=0)
    max_discount: float | None = Field(default=None, ge=0)
    max_uses: int | None = Field(default=None, ge=1)
    max_uses_per_customer: int = Field(default=1, ge=1)
    starts_at: datetime | None = None
    expires_at: datetime | None = None


class CouponOut(BaseModel):
    id: uuid.UUID
    code: str
    discount_type: str
    discount_value: float
    min_cart: float
    max_discount: float | None
    max_uses: int | None
    max_uses_per_customer: int
    used_count: int
    is_active: bool
    starts_at: datetime | None
    expires_at: datetime | None
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Return ─────────────────────────────────────────────────────────────────────

class ReturnRequestIn(BaseModel):
    reason: str = Field(min_length=1, max_length=100)
    details: str | None = None


class ReturnRequestOut(BaseModel):
    id: uuid.UUID
    order_id: uuid.UUID
    reason: str
    details: str | None
    status: str
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Inventory ─────────────────────────────────────────────────────────────────

class InventoryAdjustIn(BaseModel):
    product_id: uuid.UUID
    delta: int  # positive or negative
    reason: str = Field(min_length=1, max_length=100)
    note: str | None = None


class InventoryOut(BaseModel):
    product_id: uuid.UUID
    product_name: str
    product_sku: str
    quantity_available: int
    quantity_reserved: int
    quantity_committed: int
    low_stock_threshold: int
    updated_at: datetime
    model_config = {"from_attributes": True}
