"""Tests for short links and crawler SSRF protection."""
from __future__ import annotations


class TestShortLinks:
    def test_redirect_not_found(self, client):
        resp = client.get("/s/nonexistent", follow_redirects=False)
        assert resp.status_code == 404

    def test_admin_create_short_link(self, client, admin_token):
        resp = client.post("/api/v1/admin/short-links", headers=admin_token, json={
            "target_url": "/shop?variety=Kanchipuram",
            "label": "Test link",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert "code" in data
        assert data["target_url"] == "/shop?variety=Kanchipuram"

    def test_reject_javascript_scheme(self, client, admin_token):
        resp = client.post("/api/v1/admin/short-links", headers=admin_token, json={
            "target_url": "javascript:alert(1)",
        })
        assert resp.status_code == 400

    def test_reject_data_scheme(self, client, admin_token):
        resp = client.post("/api/v1/admin/short-links", headers=admin_token, json={
            "target_url": "data:text/html,<script>alert(1)</script>",
        })
        assert resp.status_code == 400


class TestCrawlerSSRF:
    def test_crawler_requires_admin(self, client, customer_token):
        resp = client.post("/api/v1/admin/crawler/jobs", headers=customer_token, json={
            "seed_url": "https://example.com"
        })
        assert resp.status_code == 403

    def test_crawler_blocks_unapproved_domain(self, client, admin_token):
        """Crawl job with a domain not in approved sources should be blocked."""
        resp = client.post("/api/v1/admin/crawler/jobs", headers=admin_token, json={
            "seed_url": "https://unapproved-domain-xyz.com/products"
        })
        assert resp.status_code == 400
        assert "blocked" in resp.json()["detail"].lower() or "not in" in resp.json()["detail"].lower()

    def test_crawler_blocks_localhost(self, client, admin_token):
        """Loopback addresses must be blocked."""
        resp = client.post("/api/v1/admin/crawler/jobs", headers=admin_token, json={
            "seed_url": "http://localhost/internal"
        })
        assert resp.status_code == 400

    def test_crawler_blocks_private_ip(self, client, admin_token):
        resp = client.post("/api/v1/admin/crawler/jobs", headers=admin_token, json={
            "seed_url": "http://192.168.1.1/secret"
        })
        assert resp.status_code == 400
