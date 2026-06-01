from sqlalchemy import Boolean, Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    credits: Mapped[float] = mapped_column(Float)
    semester_recommended: Mapped[int] = mapped_column()
    department: Mapped[str] = mapped_column(String(100))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_seed_data: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")

    student_grades: Mapped[list["StudentGrade"]] = relationship(
        back_populates="course",
        cascade="all, delete-orphan",
    )
    historical_grades: Mapped[list["HistoricalGrade"]] = relationship(
        back_populates="course",
        cascade="all, delete-orphan",
    )
    predictions: Mapped[list["Prediction"]] = relationship(
        back_populates="course",
        cascade="all, delete-orphan",
    )
