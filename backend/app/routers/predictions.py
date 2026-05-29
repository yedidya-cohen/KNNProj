from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.prediction import Prediction
from app.models.user import User, UserRole
from app.schemas.prediction import (
    PredictionHistoryResponse,
    PredictionRequest,
    PredictionResponse,
    TopRecommendationResponse,
)
from app.services.knn_service import predict_grade, recommend_top_courses

router = APIRouter(prefix="/api/v1/predictions", tags=["predictions"])


def ensure_student(user: User) -> None:
    if user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student account required",
        )


@router.post("/predict", response_model=PredictionResponse)
def predict(
    request: PredictionRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    ensure_student(current_user)

    try:
        return predict_grade(
            db,
            user_id=current_user.id,
            target_course_id=request.course_id,
            k=request.k_optional,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.get("/recommend-top", response_model=list[TopRecommendationResponse])
def recommend_top(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    n: Annotated[int, Query(ge=1, le=10)] = 3,
) -> list[dict]:
    ensure_student(current_user)
    return recommend_top_courses(db, current_user.id, n=n)


@router.get("/my-history", response_model=list[PredictionHistoryResponse])
def my_history(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[Prediction]:
    ensure_student(current_user)
    statement = (
        select(Prediction)
        .options(selectinload(Prediction.course))
        .where(Prediction.user_id == current_user.id)
        .order_by(Prediction.created_at.desc())
    )
    return list(db.scalars(statement))


@router.get("/{prediction_id}", response_model=PredictionHistoryResponse)
def read_prediction(
    prediction_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Prediction:
    ensure_student(current_user)
    statement = (
        select(Prediction)
        .options(selectinload(Prediction.course))
        .where(Prediction.id == prediction_id, Prediction.user_id == current_user.id)
    )
    prediction = db.scalar(statement)

    if prediction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prediction not found",
        )

    return prediction
