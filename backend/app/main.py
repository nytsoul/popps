"""ShopScale FastAPI application entry point."""
from __future__ import annotations

import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging, get_logger

# Routers
from app.api.v1.routers import (
    auth,
    users,
    products,
    catalogue,
    cart,
    wishlist,
    orders,
    payments,
    reviews,
    support,
    short_links,
    admin_products,
    admin_orders,
    admin_inventory,
    admin_content,
    admin_users,
    admin_crawler,
    admin_links,
    admin_monitoring,
    admin_importer,
    health,
)

configure_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("ShopScale API starting", env=settings.app_env)
    yield
    logger.info("ShopScale API shutting down")


def create_app() -> FastAPI:
    app = FastAPI(
        title="ShopScale API",
        description="Backend API for ShopScale — Premium Saree E-Commerce Platform",
        version="1.0.0",
        docs_url="/api/docs" if not settings.is_production else None,
        redoc_url="/api/redoc" if not settings.is_production else None,
        openapi_url="/api/openapi.json" if not settings.is_production else None,
        lifespan=lifespan,
    )

    # ── CORS ──────────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID", "Retry-After"],
    )

    # ── Request timing middleware ─────────────────────────────────────────────
    @app.middleware("http")
    async def add_timing(request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000)
        response.headers["X-Response-Time-Ms"] = str(duration_ms)
        return response

    # ── Exception handlers ────────────────────────────────────────────────────
    register_exception_handlers(app)

    # ── Static file serving (uploaded media) ─────────────────────────────────
    import os
    uploads_dir = os.path.abspath(settings.local_upload_dir)
    os.makedirs(uploads_dir, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

    # ── Routers ───────────────────────────────────────────────────────────────
    PREFIX = "/api/v1"

    app.include_router(health.router, prefix=PREFIX, tags=["Health"])
    app.include_router(auth.router, prefix=PREFIX, tags=["Auth"])
    app.include_router(users.router, prefix=PREFIX, tags=["Users"])
    app.include_router(products.router, prefix=PREFIX, tags=["Products"])
    app.include_router(catalogue.router, prefix=PREFIX, tags=["Catalogue"])
    app.include_router(cart.router, prefix=PREFIX, tags=["Cart"])
    app.include_router(wishlist.router, prefix=PREFIX, tags=["Wishlist"])
    app.include_router(orders.router, prefix=PREFIX, tags=["Orders"])
    app.include_router(payments.router, prefix=PREFIX, tags=["Payments"])
    app.include_router(reviews.router, prefix=PREFIX, tags=["Reviews"])
    app.include_router(support.router, prefix=PREFIX, tags=["Support"])
    app.include_router(short_links.router, tags=["Short Links"])  # handles /s/{code}

    # Admin
    app.include_router(admin_products.router, prefix=PREFIX, tags=["Admin: Products"])
    app.include_router(admin_orders.router, prefix=PREFIX, tags=["Admin: Orders"])
    app.include_router(admin_inventory.router, prefix=PREFIX, tags=["Admin: Inventory"])
    app.include_router(admin_content.router, prefix=PREFIX, tags=["Admin: Content"])
    app.include_router(admin_users.router, prefix=PREFIX, tags=["Admin: Users"])
    app.include_router(admin_crawler.router, prefix=PREFIX, tags=["Admin: Crawler"])
    app.include_router(admin_links.router, prefix=PREFIX, tags=["Admin: Short Links"])
    app.include_router(admin_monitoring.router, prefix=PREFIX, tags=["Admin: Monitoring"])
    app.include_router(admin_importer.router, prefix=PREFIX, tags=["Admin: Dataset Importer"])

    return app


app = create_app()
