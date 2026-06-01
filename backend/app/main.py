from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app import models
from app.core.security import hash_password
from app.database import Base, SessionLocal, engine, ensure_seed_marker_columns
from app.models.settings import SystemSetting
from app.models.user import User, UserRole
from app.routers import admin, auth, courses, grades, predictions

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"


def _ensure_defaults() -> None:
    with SessionLocal() as db:
        if db.scalar(select(User).where(User.username == ADMIN_USERNAME)) is None:
            db.add(User(
                username=ADMIN_USERNAME,
                password_hash=hash_password(ADMIN_PASSWORD),
                full_name="Admin",
                role=UserRole.ADMIN,
                department="computer_science",
            ))
            db.flush()
        if db.get(SystemSetting, "knn_k") is None:
            admin_user = db.scalar(select(User).where(User.username == ADMIN_USERNAME))
            db.add(SystemSetting(key="knn_k", value="5", updated_by=admin_user.id if admin_user else None))
        db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    _ = models
    Base.metadata.create_all(bind=engine)
    ensure_seed_marker_columns()
    _ensure_defaults()
    yield


app = FastAPI(
    title="Course Grade Prediction System API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(courses.router)
app.include_router(grades.router)
app.include_router(predictions.router)
app.include_router(admin.router)


@app.get("/")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
