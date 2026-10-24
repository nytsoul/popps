"""Support ticket endpoints."""
from __future__ import annotations

import random
import string
import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.support import SupportMessage, SupportTicket

router = APIRouter()


class ContactForm(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    topic: str = Field(min_length=1, max_length=100)
    message: str = Field(min_length=10, max_length=5000)
    order_reference: str | None = None


class TicketOut(BaseModel):
    id: uuid.UUID
    reference: str
    topic: str
    status: str
    created_at: datetime
    model_config = {"from_attributes": True}


@router.post("/support/tickets", response_model=TicketOut, status_code=201)
async def create_ticket(body: ContactForm, db: Annotated[Session, Depends(get_db)]):
    ref = "TKT-" + "".join(random.choices(string.digits, k=6))
    ticket = SupportTicket(
        reference=ref,
        customer_name=body.name,
        customer_email=body.email.lower(),
        topic=body.topic,
        order_reference=body.order_reference,
        status="open",
    )
    db.add(ticket)
    db.flush()
    db.add(SupportMessage(
        ticket_id=ticket.id,
        sender_name=body.name,
        body=body.message,
        is_staff=False,
    ))
    db.commit()
    db.refresh(ticket)
    return ticket


@router.get("/support/tickets", response_model=list[TicketOut])
async def list_my_tickets(
    email: str,
    db: Annotated[Session, Depends(get_db)],
):
    return (
        db.query(SupportTicket)
        .filter(SupportTicket.customer_email == email.lower())
        .order_by(SupportTicket.created_at.desc())
        .limit(20)
        .all()
    )
