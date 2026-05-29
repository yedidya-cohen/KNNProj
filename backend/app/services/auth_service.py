from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.user import User, UserRole
from app.schemas.user import UserCreate


def register_user(db: Session, user_data: UserCreate) -> User:
    """Create a student user after validating username uniqueness."""
    existing_user = db.scalar(select(User).where(User.username == user_data.username))

    if existing_user is not None:
        raise ValueError("Username already exists")

    user = User(
        username=user_data.username,
        password_hash=hash_password(user_data.password),
        full_name=user_data.full_name,
        role=UserRole.STUDENT,
        department=user_data.department,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, username: str, password: str) -> User | None:
    """Return the matching user when credentials are valid."""
    user = db.scalar(select(User).where(User.username == username))

    if user is None or not verify_password(password, user.password_hash):
        return None

    return user
