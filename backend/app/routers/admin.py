from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.dependencies import require_admin
from app.database import get_db
from app.models.user import User
from app.schemas.admin import (
    AdminUserResponse,
    DashboardStatsResponse,
    HistoricalStudentCreate,
    HistoricalStudentSummary,
    SeedResponse,
    SettingResponse,
    SettingUpdateRequest,
)
from app.schemas.prediction import ModelStatsResponse
from app.services.admin_service import (
    create_historical_student,
    get_dashboard_stats,
    get_historical_student_summary,
    get_historical_student_summaries,
    get_system_setting,
    update_system_setting,
)
from app.services.knn_service import evaluate_model, rebuild_grade_matrix_cache

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


@router.get("/dashboard", response_model=DashboardStatsResponse)
def dashboard(
    _admin: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    return get_dashboard_stats(db)


@router.get("/users", response_model=list[AdminUserResponse])
def list_users(
    _admin: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> list[User]:
    return list(db.scalars(select(User).order_by(User.id)))


@router.get(
    "/historical-students",
    response_model=list[HistoricalStudentSummary],
)
def list_historical_students(
    _admin: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> list[dict]:
    return get_historical_student_summaries(db)


@router.post(
    "/historical-students",
    response_model=HistoricalStudentSummary,
    status_code=status.HTTP_201_CREATED,
)
def add_historical_student(
    student_data: HistoricalStudentCreate,
    _admin: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    try:
        student = create_historical_student(db, student_data)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or duplicate historical grade data",
        ) from exc

    rebuild_grade_matrix_cache(db)
    summary = get_historical_student_summary(db, student.id)

    if summary is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Historical student was created but could not be reloaded",
        )

    return summary


@router.post("/seed", response_model=SeedResponse)
def seed_database_endpoint(
    _admin: Annotated[User, Depends(require_admin)],
) -> dict[str, int]:
    from app.scripts.seed_data import seed_database

    return seed_database()


@router.get("/model-stats", response_model=ModelStatsResponse)
def model_stats(
    _admin: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    return evaluate_model(db)


@router.get("/settings/{key}", response_model=SettingResponse)
def read_setting(
    key: str,
    _admin: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    setting = get_system_setting(db, key)

    if setting is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Setting not found",
        )

    return setting


@router.put("/settings/{key}", response_model=SettingResponse)
def update_setting(
    key: str,
    request: SettingUpdateRequest,
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    if key == "knn_k":
        try:
            parsed_value = int(request.value)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="knn_k must be an integer",
            ) from exc

        if parsed_value < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="knn_k must be greater than 0",
            )

    return update_system_setting(db, key, request.value, admin.id)
