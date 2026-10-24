"""Crawler job models."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


class CrawlSource(Base, UUIDMixin, TimestampMixin):
    """Approved crawl domain / source configuration."""
    __tablename__ = "crawl_sources"

    domain: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    seed_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    max_concurrency: Mapped[int] = mapped_column(Integer, default=2)
    crawl_delay_ms: Mapped[int] = mapped_column(Integer, default=1000)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)


class CrawlJob(Base, UUIDMixin, TimestampMixin):
    """A crawl execution job."""
    __tablename__ = "crawl_jobs"

    source_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("crawl_sources.id", ondelete="SET NULL"), nullable=True)
    seed_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="queued", index=True)
    # queued | running | completed | failed | blocked | cancelled
    robots_allowed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    discovered_count: Mapped[int] = mapped_column(Integer, default=0)
    processed_count: Mapped[int] = mapped_column(Integer, default=0)
    failed_count: Mapped[int] = mapped_column(Integer, default=0)
    duplicate_count: Mapped[int] = mapped_column(Integer, default=0)
    pending_review_count: Mapped[int] = mapped_column(Integer, default=0)
    imported_count: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    celery_task_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    results: Mapped[list["CrawlResult"]] = relationship(back_populates="job", cascade="all, delete-orphan")


class CrawlResult(Base, UUIDMixin):
    """An individual item discovered during a crawl."""
    __tablename__ = "crawl_results"

    job_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("crawl_jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    source_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    title: Mapped[str | None] = mapped_column(String(300), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price_raw: Mapped[str | None] = mapped_column(String(100), nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    raw_data: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON
    status: Mapped[str] = mapped_column(String(30), default="pending_review")
    # pending_review | approved | rejected | duplicate | imported
    imported_product_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    reviewed_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    job: Mapped["CrawlJob"] = relationship(back_populates="results")
