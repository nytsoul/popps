"""Dataset Import Job and Item models for the Saree Dataset Importer."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


class DatasetImportJob(Base, UUIDMixin, TimestampMixin):
    """Tracks a single dataset import session (upload → preview → approve → commit)."""
    __tablename__ = "dataset_import_jobs"

    name: Mapped[str] = mapped_column(String(300), nullable=False)
    # status: pending | scanning | ready | committing | done | failed
    status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False)
    source_filename: Mapped[str | None] = mapped_column(String(500), nullable=True)
    metadata_filename: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Counters updated after scanning
    total_images: Mapped[int] = mapped_column(Integer, default=0)
    valid_images: Mapped[int] = mapped_column(Integer, default=0)
    duplicate_images: Mapped[int] = mapped_column(Integer, default=0)
    invalid_images: Mapped[int] = mapped_column(Integer, default=0)
    metadata_errors: Mapped[int] = mapped_column(Integer, default=0)

    # Final import report counters
    imported_count: Mapped[int] = mapped_column(Integer, default=0)
    skipped_count: Mapped[int] = mapped_column(Integer, default=0)

    error_log: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON array of error strings
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    items: Mapped[list["DatasetImportItem"]] = relationship(
        back_populates="job", cascade="all, delete-orphan", lazy="dynamic"
    )


class DatasetImportItem(Base, UUIDMixin, TimestampMixin):
    """One candidate image+metadata row within a DatasetImportJob."""
    __tablename__ = "dataset_import_items"

    job_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("dataset_import_jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Source file info
    original_filename: Mapped[str] = mapped_column(String(500), nullable=False)
    storage_key: Mapped[str | None] = mapped_column(String(800), nullable=True)   # relative path inside uploads/imports/
    file_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)  # SHA-256 hex
    file_size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    image_width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    image_height: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Mapped metadata (from CSV/JSON or inferred)
    product_name: Mapped[str | None] = mapped_column(String(300), nullable=True)
    category: Mapped[str | None] = mapped_column(String(150), nullable=True)
    colour: Mapped[str | None] = mapped_column(String(100), nullable=True)
    fabric: Mapped[str | None] = mapped_column(String(100), nullable=True)
    region: Mapped[str | None] = mapped_column(String(100), nullable=True)
    technique: Mapped[str | None] = mapped_column(String(100), nullable=True)
    admin_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Review status: pending | approved | rejected | duplicate | invalid
    review_status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False)
    is_unverified: Mapped[bool] = mapped_column(Boolean, default=True)  # metadata was missing → needs review
    is_duplicate: Mapped[bool] = mapped_column(Boolean, default=False)
    duplicate_of_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # After commit: linked product
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("products.id", ondelete="SET NULL"), nullable=True, index=True
    )

    job: Mapped["DatasetImportJob"] = relationship(back_populates="items")
