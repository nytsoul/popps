"""Product, Category, Region, Fabric, Technique, Collection, Inventory models."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, CheckConstraint, ForeignKey,
    Index, Integer, String, Text, UniqueConstraint, DateTime,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


class Region(Base, UUIDMixin, TimestampMixin):
    """Indian state or international region."""
    __tablename__ = "regions"

    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    slug: Mapped[str] = mapped_column(String(120), nullable=False, unique=True, index=True)
    zone: Mapped[str] = mapped_column(String(50), nullable=False)  # South India, North India, etc.
    country: Mapped[str] = mapped_column(String(50), nullable=False)
    tradition: Mapped[str | None] = mapped_column(Text, nullable=True)
    story: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    varieties: Mapped[list["Variety"]] = relationship(back_populates="region")


class Variety(Base, UUIDMixin, TimestampMixin):
    """Saree variety / type taxonomy (Kanchipuram, Banarasi, etc.)."""
    __tablename__ = "varieties"

    slug: Mapped[str] = mapped_column(String(150), nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    aliases: Mapped[str | None] = mapped_column(Text, nullable=True)  # comma-separated
    region_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("regions.id"), nullable=True)
    garment_kind: Mapped[str] = mapped_column(String(50), default="Saree")
    status: Mapped[str] = mapped_column(String(30), default="established")
    blurb: Mapped[str | None] = mapped_column(Text, nullable=True)
    handloom_zone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    region: Mapped["Region | None"] = relationship(back_populates="varieties")
    products: Mapped[list["Product"]] = relationship(back_populates="variety_rel")


class Fabric(Base, UUIDMixin, TimestampMixin):
    """Fabric family taxonomy."""
    __tablename__ = "fabrics"

    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    slug: Mapped[str] = mapped_column(String(120), nullable=False, unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class WeavingTechnique(Base, UUIDMixin, TimestampMixin):
    """Weaving, dyeing, or embroidery technique."""
    __tablename__ = "weaving_techniques"

    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    slug: Mapped[str] = mapped_column(String(120), nullable=False, unique=True, index=True)
    group: Mapped[str] = mapped_column(String(50), nullable=False)  # Weave | Print & Dye | Embroidery & Surface
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Artisan(Base, UUIDMixin, TimestampMixin):
    """Artisan or cooperative profile."""
    __tablename__ = "artisans"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(220), nullable=False, unique=True, index=True)
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    story: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Product(Base, UUIDMixin, TimestampMixin):
    """Saree product record."""
    __tablename__ = "products"

    slug: Mapped[str] = mapped_column(String(220), nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    sku: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    story: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Taxonomy
    variety_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("varieties.id"), nullable=True, index=True)
    region_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("regions.id"), nullable=True, index=True)
    fabric_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("fabrics.id"), nullable=True)
    artisan_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("artisans.id"), nullable=True)

    # Fabric & technique detail (denormalized for display)
    fabric_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    fabric_detail: Mapped[str | None] = mapped_column(String(500), nullable=True)
    composition: Mapped[str | None] = mapped_column(String(50), nullable=True)
    loom: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Physical attributes
    motif: Mapped[str | None] = mapped_column(String(100), nullable=True)
    border: Mapped[str | None] = mapped_column(String(100), nullable=True)
    weight_class: Mapped[str | None] = mapped_column(String(50), nullable=True)  # Lightweight/Medium/Heavy
    weight_grams: Mapped[int | None] = mapped_column(Integer, nullable=True)
    length_meters: Mapped[str | None] = mapped_column(String(100), nullable=True)
    blouse_piece: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    pallu_description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    care_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    care_text: Mapped[str | None] = mapped_column(String(500), nullable=True)
    drape_style: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # Pricing (stored in integer paise to avoid floating-point issues)
    price_paise: Mapped[int] = mapped_column(Integer, nullable=False)  # e.g. 2499900 = ₹24,999.00
    compare_price_paise: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Tags & flags (stored as comma-separated strings; use ARRAY if desired)
    primary_colour: Mapped[str | None] = mapped_column(String(50), nullable=True)
    colours_json: Mapped[str | None] = mapped_column(Text, nullable=True)      # JSON array
    color_variants_json: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON array
    occasions_json: Mapped[str | None] = mapped_column(Text, nullable=True)    # JSON array
    techniques_json: Mapped[str | None] = mapped_column(Text, nullable=True)   # JSON array
    tags_json: Mapped[str | None] = mapped_column(Text, nullable=True)         # JSON array
    collections_json: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON array

    # Origin & certification
    origin_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    certification_details: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Commerce flags
    badge: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_bestseller: Mapped[bool] = mapped_column(Boolean, default=False)
    is_new: Mapped[bool] = mapped_column(Boolean, default=False)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    gift_eligible: Mapped[bool] = mapped_column(Boolean, default=True)
    admin_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Publication workflow
    publication: Mapped[str] = mapped_column(String(20), default="draft", index=True)
    published_at: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Full-text search vector (stored as text for portability; cast to tsvector in PostgreSQL queries)
    search_vector: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Soft delete
    deleted_at: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Audit
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    variety_rel: Mapped["Variety | None"] = relationship(back_populates="products")
    region_rel: Mapped["Region | None"] = relationship()
    images: Mapped[list["ProductImage"]] = relationship(
        back_populates="product", cascade="all, delete-orphan", order_by="ProductImage.sort_order"
    )
    inventory: Mapped["Inventory | None"] = relationship(back_populates="product", uselist=False)
    reviews: Mapped[list["ProductReview"]] = relationship(back_populates="product")  # type: ignore[name-defined]
    collection_links: Mapped[list["CollectionProduct"]] = relationship(back_populates="product", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_products_publication_deleted", "publication", "deleted_at"),
        CheckConstraint("price_paise > 0", name="ck_products_price_positive"),
    )


class ProductImage(Base, UUIDMixin, TimestampMixin):
    """Product image record."""
    __tablename__ = "product_images"

    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    url: Mapped[str] = mapped_column(String(1000), nullable=False)
    alt_text: Mapped[str | None] = mapped_column(String(300), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)
    storage_key: Mapped[str | None] = mapped_column(String(500), nullable=True)  # S3/Cloudinary key

    product: Mapped["Product"] = relationship(back_populates="images")


class Inventory(Base, UUIDMixin, TimestampMixin):
    """Stock record per product (1:1)."""
    __tablename__ = "inventory"

    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False, unique=True)
    quantity_available: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    quantity_reserved: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    quantity_committed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    low_stock_threshold: Mapped[int] = mapped_column(Integer, default=3)
    updated_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    product: Mapped["Product"] = relationship(back_populates="inventory")
    movements: Mapped[list["InventoryMovement"]] = relationship(back_populates="inventory", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("quantity_available >= 0", name="ck_inventory_qty_nonneg"),
        CheckConstraint("quantity_reserved >= 0", name="ck_inventory_reserved_nonneg"),
    )

    @property
    def quantity_on_hand(self) -> int:
        return self.quantity_available + self.quantity_reserved + self.quantity_committed


class InventoryMovement(Base, UUIDMixin):
    """Immutable record of every stock change."""
    __tablename__ = "inventory_movements"

    inventory_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("inventory.id", ondelete="CASCADE"), nullable=False, index=True)
    delta: Mapped[int] = mapped_column(Integer, nullable=False)  # positive = added, negative = removed
    reason: Mapped[str] = mapped_column(String(100), nullable=False)  # "order", "adjustment", "return", "correction"
    reference: Mapped[str | None] = mapped_column(String(100), nullable=True)  # order ID, etc.
    note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    inventory: Mapped["Inventory"] = relationship(back_populates="movements")


class Collection(Base, UUIDMixin, TimestampMixin):
    """Curated product collection."""
    __tablename__ = "collections"

    slug: Mapped[str] = mapped_column(String(150), nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    product_links: Mapped[list["CollectionProduct"]] = relationship(back_populates="collection", cascade="all, delete-orphan")


class CollectionProduct(Base, UUIDMixin):
    """Many-to-many between Collection and Product."""
    __tablename__ = "collection_products"

    collection_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("collections.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    collection: Mapped["Collection"] = relationship(back_populates="product_links")
    product: Mapped["Product"] = relationship(back_populates="collection_links")

    __table_args__ = (UniqueConstraint("collection_id", "product_id"),)


class Banner(Base, UUIDMixin, TimestampMixin):
    """Homepage/editorial banner."""
    __tablename__ = "banners"

    title: Mapped[str] = mapped_column(String(300), nullable=False)
    subtitle: Mapped[str | None] = mapped_column(String(500), nullable=True)
    image_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    link_to: Mapped[str] = mapped_column(String(500), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)


class HeritageArticle(Base, UUIDMixin, TimestampMixin):
    """Heritage/editorial article."""
    __tablename__ = "heritage_articles"

    slug: Mapped[str] = mapped_column(String(220), nullable=False, unique=True, index=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    subtitle: Mapped[str | None] = mapped_column(String(500), nullable=True)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)  # heritage | story | technique
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)


class ProductReview(Base, UUIDMixin, TimestampMixin):
    """Customer product review."""
    __tablename__ = "product_reviews"

    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    author_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    author_name: Mapped[str] = mapped_column(String(200), nullable=False)  # snapshot
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str | None] = mapped_column(String(300), nullable=True)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    verified_purchase: Mapped[bool] = mapped_column(Boolean, default=False)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    moderation_status: Mapped[str] = mapped_column(String(30), default="pending")  # pending | approved | rejected
    moderated_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    product: Mapped["Product"] = relationship(back_populates="reviews")
    author: Mapped["User | None"] = relationship(back_populates="reviews", foreign_keys=[author_id])

    __table_args__ = (
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_reviews_rating_range"),
    )
