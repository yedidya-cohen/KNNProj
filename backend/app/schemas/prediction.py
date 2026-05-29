from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.course import CourseResponse


class PredictionRequest(BaseModel):
    course_id: int
    k_optional: int | None = Field(default=None, ge=1, le=50)


class NeighborInfo(BaseModel):
    id: int
    avg_grade: float
    target_grade: int
    distance: float


class PredictionResponse(BaseModel):
    predicted_grade: float
    confidence: str
    k_value: int
    neighbors: list[NeighborInfo]


class TopRecommendationResponse(BaseModel):
    course: CourseResponse
    predicted_grade: float
    confidence: str


class ModelStatsResponse(BaseModel):
    mae: float
    rmse: float
    sample_size: int
    runtime_ms: float


class PredictionHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    course_id: int
    predicted_grade: float
    confidence: str
    k_value: int
    neighbor_ids: str
    created_at: datetime
    course: CourseResponse | None = None
