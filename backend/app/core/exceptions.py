"""Custom exceptions and FastAPI exception handlers."""
from __future__ import annotations

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse


class AppError(Exception):
    """Base application error."""
    def __init__(self, message: str, status_code: int = 400, detail: dict | None = None):
        self.message = message
        self.status_code = status_code
        self.detail = detail
        super().__init__(message)


class NotFoundError(AppError):
    def __init__(self, resource: str = "Resource"):
        super().__init__(f"{resource} not found.", status_code=404)


class ConflictError(AppError):
    def __init__(self, message: str = "Conflict."):
        super().__init__(message, status_code=409)


class AuthenticationError(AppError):
    def __init__(self, message: str = "Authentication failed."):
        super().__init__(message, status_code=401)


class PermissionError(AppError):
    def __init__(self, message: str = "Permission denied."):
        super().__init__(message, status_code=403)


class ValidationError(AppError):
    def __init__(self, message: str, fields: dict | None = None):
        super().__init__(message, status_code=422, detail={"fields": fields or {}})


class StockError(AppError):
    def __init__(self, message: str = "Insufficient stock."):
        super().__init__(message, status_code=409)


class PaymentError(AppError):
    def __init__(self, message: str = "Payment processing failed."):
        super().__init__(message, status_code=402)


def register_exception_handlers(app: FastAPI) -> None:
    """Register custom exception handlers on the FastAPI app."""

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        body: dict = {"error": exc.message, "status": exc.status_code}
        if exc.detail:
            body["detail"] = exc.detail
        return JSONResponse(status_code=exc.status_code, content=body)

    @app.exception_handler(404)
    async def not_found_handler(request: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "The requested resource was not found.", "status": 404},
        )

    @app.exception_handler(500)
    async def internal_error_handler(request: Request, exc: Exception) -> JSONResponse:
        # Never leak internal details to clients
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": "An unexpected error occurred. Please try again later.", "status": 500},
        )
