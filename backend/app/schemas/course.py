from pydantic import BaseModel, ConfigDict, Field


class CourseCreate(BaseModel):
    code: str = Field(min_length=2, max_length=50)
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    credits: float = Field(gt=0, le=10)
    semester_recommended: int = Field(ge=1, le=8)
    department: str = Field(default="computer_science", min_length=1, max_length=100)
    is_active: bool = True


class CourseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    description: str | None
    credits: float
    semester_recommended: int
    department: str
    is_active: bool
