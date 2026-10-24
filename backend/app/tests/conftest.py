"""pytest configuration and shared fixtures."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.db.session import get_db
from app.main import app

# Use SQLite for tests (no PostgreSQL required for CI)
TEST_DB_URL = "sqlite:///./test_shopscale.db"

test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(bind=test_engine, autocommit=False, autoflush=False)


@pytest.fixture(scope="session", autouse=True)
def create_test_tables():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db():
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def admin_token():
    """Create an admin token and return auth headers."""
    import uuid
    from app.core.security import create_access_token
    admin_id = str(uuid.uuid4())
    token = create_access_token(admin_id, {"role": "super_admin", "email": "testadmin@shopscale.dev"})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def customer_token():
    """Return auth headers for a test customer."""
    import uuid
    from app.core.security import create_access_token
    user_id = str(uuid.uuid4())
    token = create_access_token(user_id, {"role": "customer", "email": "customer@test.com"})
    return {"Authorization": f"Bearer {token}"}
