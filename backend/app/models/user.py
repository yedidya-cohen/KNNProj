from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Enum as SQLAlchemyEnum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserRole(str, Enum):
    STUDENT = "student"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(
        SQLAlchemyEnum(
            UserRole,
            name="user_role",
            values_callable=lambda roles: [role.value for role in roles],
        ),
        default=UserRole.STUDENT,
    )
    department: Mapped[str] = mapped_column(String(100), default="computer_science")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    grades: Mapped[list["StudentGrade"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    predictions: Mapped[list["Prediction"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    updated_settings: Mapped[list["SystemSetting"]] = relationship(
        back_populates="updated_by_user",
    )
