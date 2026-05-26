from pydantic import BaseModel, ConfigDict


class CourseBase(BaseModel):
    code: str
    name: str
    credits: int = 3


class CourseCreate(CourseBase):
    pass


class CourseRead(CourseBase):
    model_config = ConfigDict(from_attributes=True)

    id: int

