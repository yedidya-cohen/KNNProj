from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class HistoricalStudent(Base):
    __tablename__ = "historical_students"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    graduation_year: Mapped[int] = mapped_column()
    department: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    is_seed_data: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")

    grades: Mapped[list["HistoricalGrade"]] = relationship(
        back_populates="historical_student",
        cascade="all, delete-orphan",
    )


class HistoricalGrade(Base):
    __tablename__ = "historical_grades"
    __table_args__ = (
        CheckConstraint(
            "grade >= 0 AND grade <= 100",
            name="ck_historical_grade_range",
        ),
        UniqueConstraint(
            "historical_student_id",
            "course_id",
            name="uq_historical_grade_student_course",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    historical_student_id: Mapped[int] = mapped_column(
        ForeignKey("historical_students.id"),
        index=True,
    )
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), index=True)
    grade: Mapped[int] = mapped_column()

    historical_student: Mapped[HistoricalStudent] = relationship(back_populates="grades")
    course: Mapped["Course"] = relationship(back_populates="historical_grades")
