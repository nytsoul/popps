"""Notification tasks: email adapter (console | smtp | sendgrid)."""
from __future__ import annotations

from app.workers.celery_app import celery_app
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


@celery_app.task(
    bind=True,
    max_retries=5,
    default_retry_delay=120,
    name="shopscale.notifications.send_email",
)
def send_email(self, recipient: str, subject: str, body: str, template: str | None = None):
    """Send an email using the configured adapter."""
    if settings.email_adapter == "console":
        logger.info(
            "EMAIL (console adapter — not sent)",
            to=recipient, subject=subject,
            body_preview=body[:200] if body else "",
        )
        return {"status": "logged"}

    elif settings.email_adapter == "smtp":
        import smtplib
        from email.mime.text import MIMEText
        try:
            msg = MIMEText(body, "html")
            msg["Subject"] = subject
            msg["From"] = settings.email_from
            msg["To"] = recipient
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as s:
                s.starttls()
                s.login(settings.smtp_user, settings.smtp_password)
                s.sendmail(settings.email_from, recipient, msg.as_string())
            return {"status": "sent"}
        except Exception as exc:
            raise self.retry(exc=exc)

    elif settings.email_adapter == "sendgrid":
        # Placeholder — configure SENDGRID_API_KEY to activate
        logger.warning("SendGrid adapter not yet configured.")
        return {"status": "not_configured"}

    return {"status": "unknown_adapter"}
