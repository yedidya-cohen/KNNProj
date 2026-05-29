from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class StudentGrade(Base):
    __tablename__ = "student_grades"
    __table_args__ = (
        CheckConstraint("grade >= 0 AND grade <= 100", name="ck_student_grade_range"),
        UniqueConstraint("user_id", "course_id", name="uq_student_grade_user_course"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), index=True)
    grade: Mapped[int] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="grades")
    course: Mapped["Course"] = relationship(back_populates="student_grades")
