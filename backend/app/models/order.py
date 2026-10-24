"""Cart, Wishlist, Order, Payment, Refund, Coupon, Shipment, ReturnRequest models."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer,
    Numeric, String, Text, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


class Cart(Base, UUIDMixin, TimestampMixin):
    """Shopping cart (guest or authenticated)."""
    __tablename__ = "carts"

    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    session_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)  # for guest carts
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_abandoned: Mapped[bool] = mapped_column(Boolean, default=False)

    items: Mapped[list["CartItem"]] = relationship(back_populates="cart", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("user_id IS NOT NULL OR session_id IS NOT NULL", name="ck_cart_owner"),
    )


class CartItem(Base, UUIDMixin, TimestampMixin):
    """Line item in a cart."""
    __tablename__ = "cart_items"

    cart_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("carts.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    color_variant: Mapped[str | None] = mapped_column(String(100), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    # Price snapshot at time of adding (not used as order price — re-validated at checkout)
    unit_price_paise: Mapped[int] = mapped_column(Integer, nullable=False)

    cart: Mapped["Cart"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship()  # type: ignore[name-defined]

    __table_args__ = (
        UniqueConstraint("cart_id", "product_id", "color_variant", name="uq_cart_items"),
        CheckConstraint("quantity > 0", name="ck_cart_item_qty_positive"),
    )


class WishlistItem(Base, UUIDMixin, TimestampMixin):
    """Customer wishlist item."""
    __tablename__ = "wishlist_items"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False)

    user: Mapped["User"] = relationship(back_populates="wishlist_items")  # type: ignore[name-defined]
    product: Mapped["Product"] = relationship()  # type: ignore[name-defined]

    __table_args__ = (UniqueConstraint("user_id", "product_id"),)


class Coupon(Base, UUIDMixin, TimestampMixin):
    """Discount coupon."""
    __tablename__ = "coupons"

    code: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    discount_type: Mapped[str] = mapped_column(String(20), nullable=False)  # percentage | fixed
    discount_value: Mapped[int] = mapped_column(Integer, nullable=False)  # paise for fixed, basis points for %
    min_cart_paise: Mapped[int] = mapped_column(Integer, default=0)
    max_discount_paise: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_uses: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_uses_per_customer: Mapped[int] = mapped_column(Integer, default=1)
    used_count: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    redemptions: Mapped[list["CouponRedemption"]] = relationship(back_populates="coupon")

    __table_args__ = (
        CheckConstraint("discount_value > 0", name="ck_coupon_discount_positive"),
    )


class CouponRedemption(Base, UUIDMixin):
    """Record of a coupon being applied to an order."""
    __tablename__ = "coupon_redemptions"

    coupon_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("coupons.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    order_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("orders.id", ondelete="SET NULL"), nullable=True)
    discount_applied_paise: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    coupon: Mapped["Coupon"] = relationship(back_populates="redemptions")


class Order(Base, UUIDMixin, TimestampMixin):
    """Customer order."""
    __tablename__ = "orders"

    reference: Mapped[str] = mapped_column(String(30), nullable=False, unique=True, index=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    customer_email: Mapped[str] = mapped_column(String(320), nullable=False)  # snapshot
    customer_name: Mapped[str] = mapped_column(String(200), nullable=False)

    # Address snapshot (denormalized — persists even if address is deleted)
    address_line1: Mapped[str] = mapped_column(String(255), nullable=False)
    address_line2: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address_city: Mapped[str] = mapped_column(String(100), nullable=False)
    address_state: Mapped[str] = mapped_column(String(100), nullable=False)
    address_pincode: Mapped[str] = mapped_column(String(20), nullable=False)
    address_phone: Mapped[str] = mapped_column(String(30), nullable=False)

    # Amounts (all in paise)
    subtotal_paise: Mapped[int] = mapped_column(Integer, nullable=False)
    shipping_paise: Mapped[int] = mapped_column(Integer, default=0)
    discount_paise: Mapped[int] = mapped_column(Integer, default=0)
    tax_paise: Mapped[int] = mapped_column(Integer, default=0)
    total_paise: Mapped[int] = mapped_column(Integer, nullable=False)

    coupon_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="pending_payment", index=True)
    # pending_payment | confirmed | processing | packed | shipped | delivered | cancelled | return_requested | returned | refund_pending | refunded

    gift_wrap: Mapped[bool] = mapped_column(Boolean, default=False)
    gift_message: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_mock: Mapped[bool] = mapped_column(Boolean, default=False)  # demo orders
    idempotency_key: Mapped[str | None] = mapped_column(String(128), nullable=True, unique=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancellation_reason: Mapped[str | None] = mapped_column(String(300), nullable=True)

    customer: Mapped["User | None"] = relationship(back_populates="orders")  # type: ignore[name-defined]
    items: Mapped[list["OrderItem"]] = relationship(back_populates="order", cascade="all, delete-orphan")
    payments: Mapped[list["Payment"]] = relationship(back_populates="order")
    shipments: Mapped[list["Shipment"]] = relationship(back_populates="order")
    return_requests: Mapped[list["ReturnRequest"]] = relationship(back_populates="order")
    status_events: Mapped[list["OrderStatusEvent"]] = relationship(back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base, UUIDMixin):
    """Line item snapshot — never references the live product price."""
    __tablename__ = "order_items"

    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("products.id", ondelete="SET NULL"), nullable=True)

    # Snapshots (preserved even if the product is edited/deleted)
    product_name: Mapped[str] = mapped_column(String(300), nullable=False)
    product_sku: Mapped[str] = mapped_column(String(100), nullable=False)
    color_variant: Mapped[str | None] = mapped_column(String(100), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price_paise: Mapped[int] = mapped_column(Integer, nullable=False)
    total_paise: Mapped[int] = mapped_column(Integer, nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    order: Mapped["Order"] = relationship(back_populates="items")


class OrderStatusEvent(Base, UUIDMixin):
    """Immutable order status transition log."""
    __tablename__ = "order_status_events"

    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    order: Mapped["Order"] = relationship(back_populates="status_events")


class Payment(Base, UUIDMixin, TimestampMixin):
    """Payment attempt for an order."""
    __tablename__ = "payments"

    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(30), nullable=False)  # mock | razorpay
    provider_payment_id: Mapped[str | None] = mapped_column(String(200), nullable=True, unique=True)
    provider_order_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    amount_paise: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    status: Mapped[str] = mapped_column(String(30), default="created")  # created | authorized | captured | failed | refunded
    raw_response: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    order: Mapped["Order"] = relationship(back_populates="payments")
    refunds: Mapped[list["Refund"]] = relationship(back_populates="payment")


class Refund(Base, UUIDMixin, TimestampMixin):
    """Refund record against a payment."""
    __tablename__ = "refunds"

    payment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("payments.id", ondelete="CASCADE"), nullable=False)
    amount_paise: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str | None] = mapped_column(String(300), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="pending")  # pending | processed | failed
    provider_refund_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    processed_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    payment: Mapped["Payment"] = relationship(back_populates="refunds")


class Shipment(Base, UUIDMixin, TimestampMixin):
    """Shipment / dispatch record for an order."""
    __tablename__ = "shipments"

    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    carrier: Mapped[str | None] = mapped_column(String(100), nullable=True)
    tracking_number: Mapped[str | None] = mapped_column(String(200), nullable=True)
    tracking_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    estimated_delivery: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="pending")

    order: Mapped["Order"] = relationship(back_populates="shipments")


class ReturnRequest(Base, UUIDMixin, TimestampMixin):
    """Customer return/refund request."""
    __tablename__ = "return_requests"

    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reason: Mapped[str] = mapped_column(String(100), nullable=False)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="requested")  # requested | approved | rejected | refunded
    resolved_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_mock: Mapped[bool] = mapped_column(Boolean, default=False)

    order: Mapped["Order"] = relationship(back_populates="return_requests")
