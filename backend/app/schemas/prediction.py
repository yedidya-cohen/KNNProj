from pydantic import BaseModel, ConfigDict


class PredictionInput(BaseModel):
    course_id: int
    midterm_score: float
    assignment_average: float
    attendance_rate: float


class NeighborResult(BaseModel):
    historical_record_id: int
    distance: float
    final_grade: float


class PredictionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    predicted_grade: float
    confidence: float | None = None
    neighbors: list[NeighborResult] = []

