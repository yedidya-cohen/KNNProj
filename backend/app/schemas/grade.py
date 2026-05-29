from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.course import CourseResponse


class GradeCreate(BaseModel):
    course_id: int
    grade: int = Field(ge=0, le=100)


class GradeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    course_id: int
    grade: int
    created_at: datetime
    course: CourseResponse | None = None


class BulkGradeRequest(BaseModel):
    grades: list[GradeCreate]
