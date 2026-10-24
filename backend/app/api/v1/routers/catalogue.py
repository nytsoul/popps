"""Catalogue taxonomy endpoints: regions, fabrics, techniques, collections, heritage."""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.product import (
    Artisan, Banner, Collection, Fabric, HeritageArticle, Region, Variety, WeavingTechnique,
)
from app.schemas.product import (
    ArtisanOut, BannerOut, CollectionOut, FabricOut, HeritageArticleOut,
    RegionOut, TechniqueOut, VarietyOut,
)

router = APIRouter()


@router.get("/regions", response_model=list[RegionOut])
async def list_regions(db: Annotated[Session, Depends(get_db)]):
    return db.query(Region).filter(Region.is_active == True).order_by(Region.name).all()  # noqa: E712


@router.get("/fabrics", response_model=list[FabricOut])
async def list_fabrics(db: Annotated[Session, Depends(get_db)]):
    return db.query(Fabric).filter(Fabric.is_active == True).order_by(Fabric.name).all()  # noqa: E712


@router.get("/techniques", response_model=list[TechniqueOut])
async def list_techniques(db: Annotated[Session, Depends(get_db)]):
    return db.query(WeavingTechnique).filter(WeavingTechnique.is_active == True).order_by(WeavingTechnique.name).all()  # noqa: E712


@router.get("/varieties", response_model=list[VarietyOut])
async def list_varieties(db: Annotated[Session, Depends(get_db)]):
    return db.query(Variety).filter(Variety.is_active == True).order_by(Variety.name).all()  # noqa: E712


@router.get("/artisans", response_model=list[ArtisanOut])
async def list_artisans(db: Annotated[Session, Depends(get_db)]):
    return db.query(Artisan).filter(Artisan.is_active == True).order_by(Artisan.name).all()  # noqa: E712


@router.get("/collections", response_model=list[CollectionOut])
async def list_collections(db: Annotated[Session, Depends(get_db)]):
    return (
        db.query(Collection)
        .filter(Collection.is_active == True)  # noqa: E712
        .order_by(Collection.sort_order, Collection.name)
        .all()
    )


@router.get("/banners", response_model=list[BannerOut])
async def list_banners(db: Annotated[Session, Depends(get_db)]):
    return (
        db.query(Banner)
        .filter(Banner.is_active == True)  # noqa: E712
        .order_by(Banner.sort_order)
        .all()
    )


@router.get("/heritage", response_model=list[HeritageArticleOut])
async def list_heritage(db: Annotated[Session, Depends(get_db)]):
    return (
        db.query(HeritageArticle)
        .filter(HeritageArticle.is_published == True)  # noqa: E712
        .order_by(HeritageArticle.created_at.desc())
        .all()
    )


@router.get("/stories", response_model=list[HeritageArticleOut])
async def list_stories(db: Annotated[Session, Depends(get_db)]):
    return (
        db.query(HeritageArticle)
        .filter(HeritageArticle.is_published == True, HeritageArticle.category == "story")  # noqa: E712
        .order_by(HeritageArticle.created_at.desc())
        .all()
    )
