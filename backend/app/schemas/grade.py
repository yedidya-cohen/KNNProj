from pydantic import BaseModel, ConfigDict


class GradeBase(BaseModel):
    course_id: int
    assessment_name: str
    score: float
    weight: float


class GradeCreate(GradeBase):
    pass


class GradeRead(GradeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int

