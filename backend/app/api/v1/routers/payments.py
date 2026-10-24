"""Payment adapter interface and mock/razorpay endpoints."""
from __future__ import annotations

import hashlib
import hmac
import json
import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.order import Order, OrderStatusEvent, Payment
from app.schemas.order import CreatePaymentRequest, CreatePaymentResponse

router = APIRouter()
PAISE = 100


@router.post("/payments/create", response_model=CreatePaymentResponse)
async def create_payment(
    body: CreatePaymentRequest,
    db: Annotated[Session, Depends(get_db)],
):
    """Initiate payment for an order."""
    order = db.query(Order).filter(Order.id == body.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")
    if order.status not in ("pending_payment",):
        raise HTTPException(status_code=409, detail="Order is not awaiting payment.")

    if settings.payment_adapter == "mock":
        payment = Payment(
            order_id=order.id,
            provider="mock",
            amount_paise=order.total_paise,
            currency="INR",
            status="created",
        )
        db.add(payment)
        db.commit()
        db.refresh(payment)
        return CreatePaymentResponse(
            payment_id=payment.id,
            provider="mock",
            provider_order_id=None,
            amount=order.total_paise / PAISE,
            currency="INR",
            mock=True,
        )

    elif settings.payment_adapter == "razorpay":
        try:
            import razorpay  # type: ignore
            client = razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_key_secret))
            rp_order = client.order.create({
                "amount": order.total_paise,
                "currency": "INR",
                "receipt": str(order.id),
            })
            payment = Payment(
                order_id=order.id,
                provider="razorpay",
                provider_order_id=rp_order["id"],
                amount_paise=order.total_paise,
                currency="INR",
                status="created",
            )
            db.add(payment)
            db.commit()
            db.refresh(payment)
            return CreatePaymentResponse(
                payment_id=payment.id,
                provider="razorpay",
                provider_order_id=rp_order["id"],
                amount=order.total_paise / PAISE,
                currency="INR",
                razorpay_key_id=settings.razorpay_key_id,
                mock=False,
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail="Payment initiation failed.")
    else:
        raise HTTPException(status_code=503, detail="Payment adapter not configured.")


@router.post("/payments/webhook")
async def payment_webhook(request: Request, db: Annotated[Session, Depends(get_db)]):
    """
    Receive and verify payment webhooks from the provider.
    NEVER mark an order as paid based on a frontend success screen.
    """
    body_bytes = await request.body()
    body_text = body_bytes.decode("utf-8")

    if settings.payment_adapter == "mock":
        # Mock webhook: accepts a JSON body with {payment_id, status: "captured"}
        payload = json.loads(body_text)
        payment_id = uuid.UUID(payload.get("payment_id", ""))
        payment = db.query(Payment).filter(Payment.id == payment_id).first()
        if not payment:
            return {"status": "ignored"}
        if payload.get("status") == "captured":
            _confirm_payment(db, payment)
        return {"status": "ok"}

    elif settings.payment_adapter == "razorpay":
        # Verify Razorpay webhook signature
        signature = request.headers.get("X-Razorpay-Signature", "")
        expected = hmac.new(
            settings.razorpay_webhook_secret.encode(),
            body_bytes,
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise HTTPException(status_code=400, detail="Invalid webhook signature.")

        payload = json.loads(body_text)
        event = payload.get("event", "")
        if event == "payment.captured":
            rp_payment_id = payload["payload"]["payment"]["entity"]["id"]
            rp_order_id = payload["payload"]["payment"]["entity"]["order_id"]
            payment = db.query(Payment).filter(Payment.provider_order_id == rp_order_id).first()
            if payment:
                payment.provider_payment_id = rp_payment_id
                _confirm_payment(db, payment)
        return {"status": "ok"}


def _confirm_payment(db: Session, payment: Payment) -> None:
    """Mark a payment as captured and advance the order to confirmed."""
    payment.status = "captured"
    payment.verified_at = datetime.now(timezone.utc)
    order = db.query(Order).filter(Order.id == payment.order_id).first()
    if order and order.status == "pending_payment":
        order.status = "confirmed"
        db.add(OrderStatusEvent(
            order_id=order.id,
            status="confirmed",
            note=f"Payment verified via {payment.provider}.",
        ))
    db.commit()
