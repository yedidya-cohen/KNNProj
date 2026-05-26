from sqlalchemy import Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class HistoricalRecord(Base):
    __tablename__ = "historical_records"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), index=True)
    midterm_score: Mapped[float] = mapped_column(Float)
    assignment_average: Mapped[float] = mapped_column(Float)
    attendance_rate: Mapped[float] = mapped_column(Float)
    final_grade: Mapped[float] = mapped_column(Float)

