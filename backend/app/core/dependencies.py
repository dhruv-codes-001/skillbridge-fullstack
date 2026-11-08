from typing import Optional
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User


def get_token_from_request(request: Request) -> Optional[str]:
    """
    Extract JWT from HttpOnly cookie or Authorization Bearer header.
    Prefers the HttpOnly cookie for web security; falls back to header for API testing/Swagger.
    """
    # 1. Check HttpOnly cookie
    cookie_token = request.cookies.get("access_token")
    if cookie_token:
        return cookie_token

    # 2. Check Authorization header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:].strip()

    return None


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    """Dependency that verifies JWT token and retrieves the current authenticated user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or session expired.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = get_token_from_request(request)
    if not token:
        raise credentials_exception

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id_str: Optional[str] = payload.get("sub")
    if not user_id_str:
        raise credentials_exception

    try:
        user_id = int(user_id_str)
    except ValueError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user account.",
        )

    return user


def get_current_learner(
    current_user: User = Depends(get_current_user),
) -> User:
    """Dependency guarding endpoints restricted exclusively to Learners."""
    if current_user.role != "learner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: learner role required.",
        )
    return current_user


def get_current_tutor(
    current_user: User = Depends(get_current_user),
) -> User:
    """Dependency guarding endpoints restricted exclusively to Tutors."""
    if current_user.role != "tutor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: tutor role required.",
        )
    return current_user
