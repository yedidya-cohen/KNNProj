"""SQLAlchemy ORM models."""

from app.models.course import Course
from app.models.grade import StudentGrade
from app.models.historical import HistoricalGrade, HistoricalStudent
from app.models.prediction import Prediction
from app.models.settings import SystemSetting
from app.models.user import User, UserRole

__all__ = [
    "Course",
    "HistoricalGrade",
    "HistoricalStudent",
    "Prediction",
    "StudentGrade",
    "SystemSetting",
    "User",
    "UserRole",
]
