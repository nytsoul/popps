"""Tests for product catalogue endpoints."""
from __future__ import annotations

import uuid
import pytest


class TestProductCatalogue:
    def test_list_products_empty(self, client):
        resp = client.get("/api/v1/products")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)

    def test_search_products(self, client):
        resp = client.post("/api/v1/products/search", json={"q": "silk", "page": 1, "page_size": 10})
        assert resp.status_code == 200
        assert "items" in resp.json()

    def test_get_product_not_found(self, client):
        resp = client.get("/api/v1/products/nonexistent-slug")
        assert resp.status_code == 404

    def test_search_pagination_validation(self, client):
        resp = client.post("/api/v1/products/search", json={"page": 0})
        assert resp.status_code == 422

    def test_search_page_size_cap(self, client):
        resp = client.post("/api/v1/products/search", json={"page_size": 9999})
        assert resp.status_code == 422


class TestAdminProducts:
    def test_list_admin_products_requires_auth(self, client):
        resp = client.get("/api/v1/admin/products")
        assert resp.status_code == 401

    def test_customer_cannot_access_admin_products(self, client, customer_token):
        resp = client.get("/api/v1/admin/products", headers=customer_token)
        assert resp.status_code == 403

    def test_draft_product_hidden_from_public(self, client, admin_token):
        """Draft products must not appear in the public catalogue."""
        create_resp = client.post("/api/v1/admin/products", headers=admin_token, json={
            "name": "Draft Test Saree",
            "price": 999.0,
            "stock": 5,
        })
        assert create_resp.status_code == 201
        slug = create_resp.json()["slug"]

        # Should NOT be visible publicly (draft)
        public_resp = client.get(f"/api/v1/products/{slug}")
        assert public_resp.status_code == 404

    def test_published_product_visible_publicly(self, client, admin_token):
        """Publishing a product makes it appear in the public catalogue."""
        create_resp = client.post("/api/v1/admin/products", headers=admin_token, json={
            "name": "Pub Test Saree",
            "price": 1999.0,
            "stock": 10,
        })
        assert create_resp.status_code == 201
        product_id = create_resp.json()["id"]
        slug = create_resp.json()["slug"]

        # Publish it
        pub_resp = client.post(f"/api/v1/admin/products/{product_id}/publish", headers=admin_token)
        assert pub_resp.status_code == 200

        # Now visible publicly
        public_resp = client.get(f"/api/v1/products/{slug}")
        assert public_resp.status_code == 200

    def test_duplicate_sku_prevented(self, client, admin_token):
        """Two products with the same name get distinct SKUs."""
        r1 = client.post("/api/v1/admin/products", headers=admin_token, json={"name": "SKU Test A", "price": 999.0, "stock": 1})
        r2 = client.post("/api/v1/admin/products", headers=admin_token, json={"name": "SKU Test A", "price": 999.0, "stock": 1})
        assert r1.status_code == 201
        assert r2.status_code == 201
        assert r1.json()["sku"] != r2.json()["sku"]
