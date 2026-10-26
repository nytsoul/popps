"""
Bootstrap admin account creation — development only.
Run with: python -m app.db.bootstrap_admin

NEVER use this to create production admin accounts.
Use controlled deployment with secure environment variables.
"""
from __future__ import annotations

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import SessionLocal
from app.core.config import settings
from app.core.security import hash_password
from app.models.user import User


def bootstrap_admin():
    if settings.is_production:
        print("ERROR: This command cannot be run in production.")
        sys.exit(1)

    email = settings.bootstrap_admin_email
    password = settings.bootstrap_admin_password

    if not email or not password:
        print("ERROR: Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD in .env first.")
        sys.exit(1)

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email.lower()).first()
        if existing:
            print(f"Admin already exists: {email} (role={existing.role})")
            return

        admin = User(
            name="Admin",
            email=email.lower(),
            hashed_password=hash_password(password),
            role="super_admin",
            is_active=True,
            is_email_verified=True,
        )
        db.add(admin)
        db.commit()
        print(f"✓ Admin account created: {email}")
        print("  Change the password via the admin panel before going to production.")
    finally:
        db.close()


if __name__ == "__main__":
    bootstrap_admin()
