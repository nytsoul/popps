"""Tests for authentication endpoints."""
from __future__ import annotations

import pytest


class TestRegister:
    def test_register_success(self, client):
        resp = client.post("/api/v1/auth/register", json={
            "name": "Priya Test",
            "email": "priya@test.com",
            "password": "securepass1",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_register_weak_password(self, client):
        resp = client.post("/api/v1/auth/register", json={
            "name": "Test",
            "email": "test2@test.com",
            "password": "short",
        })
        assert resp.status_code == 422

    def test_register_duplicate_email(self, client):
        payload = {"name": "Dup", "email": "dup@test.com", "password": "password123"}
        client.post("/api/v1/auth/register", json=payload)
        resp = client.post("/api/v1/auth/register", json=payload)
        assert resp.status_code == 400

    def test_register_invalid_email(self, client):
        resp = client.post("/api/v1/auth/register", json={
            "name": "Test",
            "email": "not-an-email",
            "password": "password123",
        })
        assert resp.status_code == 422


class TestLogin:
    def test_login_success(self, client):
        client.post("/api/v1/auth/register", json={
            "name": "Login Test", "email": "logintest@test.com", "password": "mypassword1"
        })
        resp = client.post("/api/v1/auth/login", json={
            "email": "logintest@test.com", "password": "mypassword1"
        })
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    def test_login_wrong_password(self, client):
        client.post("/api/v1/auth/register", json={
            "name": "WP Test", "email": "wptest@test.com", "password": "correct1"
        })
        resp = client.post("/api/v1/auth/login", json={
            "email": "wptest@test.com", "password": "wrong1234"
        })
        assert resp.status_code == 401

    def test_login_unknown_email(self, client):
        resp = client.post("/api/v1/auth/login", json={
            "email": "nobody@test.com", "password": "password123"
        })
        assert resp.status_code == 401


class TestForgotPassword:
    def test_forgot_password_always_returns_202(self, client):
        """Same response for registered and unregistered emails (prevents enumeration)."""
        resp = client.post("/api/v1/auth/forgot-password", json={"email": "nobody@example.com"})
        assert resp.status_code == 202
        resp2 = client.post("/api/v1/auth/forgot-password", json={"email": "real@test.com"})
        assert resp2.status_code == 202


class TestHealthEndpoints:
    def test_health(self, client):
        resp = client.get("/api/v1/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"
