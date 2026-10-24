"""Pydantic v2 schemas for product catalogue endpoints."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator, model_validator


# ── Taxonomy ─────────────────────────────────────────────────────────────────

class RegionOut(BaseModel):
    id: uuid.UUID
    slug: str
    name: str
    zone: str
    country: str
    tradition: str | None
    story: str | None
    image_url: str | None
    model_config = {"from_attributes": True}


class VarietyOut(BaseModel):
    id: uuid.UUID
    slug: str
    name: str
    aliases: str | None
    garment_kind: str
    status: str
    blurb: str | None
    model_config = {"from_attributes": True}


class FabricOut(BaseModel):
    id: uuid.UUID
    slug: str
    name: str
    description: str | None
    model_config = {"from_attributes": True}


class TechniqueOut(BaseModel):
    id: uuid.UUID
    slug: str
    name: str
    group: str
    description: str | None
    model_config = {"from_attributes": True}


class ArtisanOut(BaseModel):
    id: uuid.UUID
    slug: str
    name: str
    location: str | None
    story: str | None
    image_url: str | None
    verified: bool
    model_config = {"from_attributes": True}


# ── Product Image ─────────────────────────────────────────────────────────────

class ProductImageOut(BaseModel):
    id: uuid.UUID
    url: str
    alt_text: str | None
    sort_order: int
    is_primary: bool
    model_config = {"from_attributes": True}


# ── Product (public) ──────────────────────────────────────────────────────────

class ProductOut(BaseModel):
    id: uuid.UUID
    slug: str
    name: str
    sku: str
    description: str | None
    story: str | None
    variety: str | None = None   # variety name (denormalized)
    variety_slug: str | None = None
    region: str | None = None    # region name
    state: str | None = None
    country: str | None = None
    zone: str | None = None
    garment_kind: str | None = None
    fabric_name: str | None
    fabric_detail: str | None
    composition: str | None
    loom: str | None
    motif: str | None
    border: str | None
    weight_class: str | None
    weight_grams: int | None
    length_meters: str | None
    blouse_piece: bool | None
    pallu_description: str | None
    care_type: str | None
    care_text: str | None
    primary_colour: str | None
    colours: list[str] = []
    color_variants: list[str] = []
    occasions: list[str] = []
    techniques: list[str] = []
    tags: list[str] = []
    collections: list[str] = []
    # Price in rupees (float for display)
    price: float
    original_price: float | None
    badge: str | None
    is_bestseller: bool
    is_new: bool
    is_featured: bool
    gift_eligible: bool
    origin_verified: bool
    artisan_name: str | None = None
    publication: str
    images: list[ProductImageOut] = []
    # Inventory
    stock: int = 0
    low_stock_threshold: int = 3
    rating: float = 0.0
    review_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Product (admin detail — includes admin_note, etc.) ───────────────────────

class ProductAdminOut(ProductOut):
    admin_note: str | None = None
    created_by_id: uuid.UUID | None = None
    updated_by_id: uuid.UUID | None = None


# ── Product creation / update ─────────────────────────────────────────────────

class ProductIn(BaseModel):
    name: str = Field(min_length=1, max_length=300)
    description: str | None = None
    story: str | None = None
    variety_slug: str | None = None
    fabric_name: str | None = None
    fabric_detail: str | None = None
    composition: str | None = None
    loom: str | None = None
    motif: str | None = None
    border: str | None = None
    weight_class: str | None = None
    weight_grams: int | None = Field(default=None, ge=0, le=10000)
    length_meters: str | None = None
    blouse_piece: bool | None = None
    pallu_description: str | None = None
    care_type: str | None = None
    care_text: str | None = None
    primary_colour: str | None = None
    colours: list[str] = []
    color_variants: list[str] = []
    occasions: list[str] = []
    techniques: list[str] = []
    tags: list[str] = []
    collections: list[str] = []
    # Price in rupees
    price: float = Field(gt=0, le=10_000_000)
    original_price: float | None = Field(default=None, ge=0)
    stock: int = Field(default=0, ge=0)
    low_stock_threshold: int = Field(default=3, ge=0)
    images: list[str] = []   # URLs
    badge: str | None = None
    is_bestseller: bool = False
    is_new: bool = False
    is_featured: bool = False
    gift_eligible: bool = True
    origin_verified: bool = False
    artisan_name: str | None = None
    admin_note: str | None = None


class ProductUpdate(BaseModel):
    """Partial update — all fields optional."""
    name: str | None = Field(default=None, max_length=300)
    description: str | None = None
    story: str | None = None
    fabric_name: str | None = None
    fabric_detail: str | None = None
    composition: str | None = None
    loom: str | None = None
    motif: str | None = None
    border: str | None = None
    weight_class: str | None = None
    weight_grams: int | None = None
    length_meters: str | None = None
    blouse_piece: bool | None = None
    pallu_description: str | None = None
    care_type: str | None = None
    care_text: str | None = None
    primary_colour: str | None = None
    colours: list[str] | None = None
    color_variants: list[str] | None = None
    occasions: list[str] | None = None
    techniques: list[str] | None = None
    tags: list[str] | None = None
    collections: list[str] | None = None
    price: float | None = Field(default=None, gt=0)
    original_price: float | None = None
    badge: str | None = None
    is_bestseller: bool | None = None
    is_new: bool | None = None
    is_featured: bool | None = None
    gift_eligible: bool | None = None
    origin_verified: bool | None = None
    artisan_name: str | None = None
    admin_note: str | None = None
    images: list[str] | None = None


# ── Search / filter ───────────────────────────────────────────────────────────

class ProductSearchRequest(BaseModel):
    q: str | None = None
    filters: dict[str, list[str]] = {}
    min_price: float | None = Field(default=None, ge=0)
    max_price: float | None = Field(default=None, ge=0)
    sort: str = "recommended"
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=24, ge=1, le=100)
    include_unpublished: bool = False  # admin only


class FacetCount(BaseModel):
    value: str
    count: int


class PagedProducts(BaseModel):
    items: list[ProductOut]
    total: int
    page: int
    page_size: int
    facets: dict[str, list[FacetCount]] = {}
    suggestion: str | None = None
    meta: dict[str, Any] = {}


# ── Collection / Banner ───────────────────────────────────────────────────────

class CollectionOut(BaseModel):
    id: uuid.UUID
    slug: str
    name: str
    description: str | None
    image_url: str | None
    sort_order: int
    model_config = {"from_attributes": True}


class BannerOut(BaseModel):
    id: uuid.UUID
    title: str
    subtitle: str | None
    image_url: str
    link_to: str
    sort_order: int
    model_config = {"from_attributes": True}


class HeritageArticleOut(BaseModel):
    id: uuid.UUID
    slug: str
    title: str
    subtitle: str | None
    body: str | None
    image_url: str | None
    category: str | None
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Reviews ───────────────────────────────────────────────────────────────────

class ReviewIn(BaseModel):
    product_id: uuid.UUID
    rating: int = Field(ge=1, le=5)
    title: str | None = Field(default=None, max_length=300)
    body: str | None = None


class ReviewOut(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    author_name: str
    rating: int
    title: str | None
    body: str | None
    verified_purchase: bool
    is_demo: bool
    moderation_status: str
    created_at: datetime
    model_config = {"from_attributes": True}
