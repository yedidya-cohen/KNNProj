from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.user import UserRole


class SettingUpdateRequest(BaseModel):
    value: str = Field(min_length=1)


class SettingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    key: str
    value: str
    updated_by: int | None
    updated_at: datetime


class MostPredictedCourse(BaseModel):
    course_id: int
    code: str
    name: str
    prediction_count: int


class DashboardStatsResponse(BaseModel):
    total_users: int
    total_predictions: int
    avg_historical_grade: float | None
    most_predicted_courses: list[MostPredictedCourse]


class AdminUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    full_name: str
    role: UserRole
    department: str
    created_at: datetime


class HistoricalGradeCreate(BaseModel):
    course_id: int
    grade: int = Field(ge=0, le=100)


class HistoricalStudentCreate(BaseModel):
    graduation_year: int = Field(ge=1990, le=2100)
    department: str = Field(default="computer_science", min_length=1, max_length=100)
    grades: list[HistoricalGradeCreate] = Field(default_factory=list)


class HistoricalStudentSummary(BaseModel):
    id: int
    graduation_year: int
    department: str
    created_at: datetime
    grade_count: int
    avg_grade: float | None


class SeedResponse(BaseModel):
    courses: int
    historical_students: int
    historical_grades: int
    seeded_historical_students: int
    users: int
    settings: int
