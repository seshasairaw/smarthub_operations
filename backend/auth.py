"""
Authentication utilities for JWT token generation, password verification, and auth dependencies.
This module provides Pydantic models for login requests/responses and helper functions for bcrypt password hashing.
"""
import os
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from pydantic import BaseModel
import bcrypt

# JWT Configuration
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret-key-change-in-production-12345")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

security = HTTPBearer()

# Pydantic Models
class LoginRequest(BaseModel):
    username_or_email: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    first_name: str
    last_name: str
    role_code: str
    phone: Optional[str] = None

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# Password utilities
def verify_password(plain_password: str, password_hash: str) -> bool:
    """Verify a plain password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), password_hash.encode('utf-8'))
    except Exception:
        return False


def hash_password(plain_password: str) -> str:
    """Hash a plain password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(plain_password.encode('utf-8'), salt).decode('utf-8')


# JWT utilities
def create_access_token(data: dict) -> str:
    """Create a JWT access token with 24-hour expiration."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def verify_token(token: str) -> dict:
    """Verify and decode a JWT token. Raises HTTPException if invalid."""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


# Auth dependency for protected endpoints
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    FastAPI dependency to extract and verify JWT token from Authorization header.
    Returns the decoded token payload (user_id, role, username).
    Use this with Depends() to protect endpoints:

    @app.get("/protected")
    def protected_route(user: dict = Depends(get_current_user)):
        return {"user_id": user["sub"], "role": user["role"]}
    """
    token = credentials.credentials
    return verify_token(token)
