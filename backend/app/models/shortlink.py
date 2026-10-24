"""Short link models."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


class ShortLink(Base, UUIDMixin, TimestampMixin):
    """Internal short URL record."""
    __tablename__ = "short_links"

    code: Mapped[str] = mapped_column(String(20), nullable=False, unique=True, index=True)
    target_url: Mapped[str] = mapped_column(String(2000), nullable=False)
    label: Mapped[str | None] = mapped_column(String(300), nullable=True)
    campaign_tag: Mapped[str | None] = mapped_column(String(100), nullable=True)
    click_count: Mapped[int] = mapped_column(Integer, default=0)
    max_clicks: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    clicks: Mapped[list["ShortLinkClick"]] = relationship(back_populates="link", cascade="all, delete-orphan")


class ShortLinkClick(Base, UUIDMixin):
    """Aggregate click analytics (no personal data stored)."""
    __tablename__ = "short_link_clicks"

    link_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("short_links.id", ondelete="CASCADE"), nullable=False, index=True)
    referrer_host: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    link: Mapped["ShortLink"] = relationship(back_populates="clicks")
