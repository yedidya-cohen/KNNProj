from functools import lru_cache
from os import getenv

from pydantic import BaseModel, Field


class Settings(BaseModel):
    database_url: str = Field(
        default_factory=lambda: getenv("DATABASE_URL", "sqlite:///./grade_prediction.db")
    )
    jwt_secret_key: str = Field(
        default_factory=lambda: getenv("JWT_SECRET_KEY", "change-me-in-development")
    )
    jwt_algorithm: str = Field(default_factory=lambda: getenv("JWT_ALGORITHM", "HS256"))
    jwt_expire_minutes: int = Field(
        default_factory=lambda: int(getenv("JWT_EXPIRE_MINUTES", "1440"))
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
