"""Reviews endpoints."""
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.permissions import get_current_token
from app.db.session import get_db
from app.models.product import ProductReview
from app.schemas.product import ReviewIn, ReviewOut

router = APIRouter()


@router.get("/reviews", response_model=list[ReviewOut])
async def list_reviews(
    product_id: uuid.UUID = Query(...),
    db: Annotated[Session, Depends(get_db)] = ...,
):
    return (
        db.query(ProductReview)
        .filter(ProductReview.product_id == product_id, ProductReview.moderation_status == "approved")
        .order_by(ProductReview.created_at.desc())
        .limit(50)
        .all()
    )


@router.post("/reviews", response_model=ReviewOut, status_code=201)
async def create_review(
    body: ReviewIn,
    token: Annotated[dict, Depends(get_current_token)],
    db: Annotated[Session, Depends(get_db)],
):
    from app.models.user import User
    user_id = uuid.UUID(token["sub"])
    user = db.query(User).filter(User.id == user_id).first()
    review = ProductReview(
        product_id=body.product_id,
        author_id=user_id,
        author_name=user.name if user else "Anonymous",
        rating=body.rating,
        title=body.title,
        body=body.body,
        moderation_status="pending",
        verified_purchase=False,
        is_demo=False,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review
