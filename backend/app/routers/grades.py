from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.grade import BulkGradeRequest, GradeCreate, GradeResponse
from app.services.course_service import get_active_course
from app.services.grade_service import (
    add_or_update_grade,
    bulk_update_grades,
    delete_grade,
    get_user_grade,
    get_user_grades,
    update_grade,
)

router = APIRouter(prefix="/api/v1/grades", tags=["grades"])


def ensure_student(user: User) -> None:
    if user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student account required",
        )


def ensure_course_exists(db: Session, course_id: int) -> None:
    if get_active_course(db, course_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )


@router.get("/my", response_model=list[GradeResponse])
def my_grades(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list:
    ensure_student(current_user)
    return get_user_grades(db, current_user.id)


@router.post("/", response_model=GradeResponse, status_code=status.HTTP_201_CREATED)
def create_grade(
    grade_data: GradeCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    ensure_student(current_user)
    ensure_course_exists(db, grade_data.course_id)
    return add_or_update_grade(
        db,
        user_id=current_user.id,
        course_id=grade_data.course_id,
        grade=grade_data.grade,
    )


@router.put("/{grade_id}", response_model=GradeResponse)
def update_my_grade(
    grade_id: int,
    grade_data: GradeCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    ensure_student(current_user)
    student_grade = get_user_grade(db, current_user.id, grade_id)

    if student_grade is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grade not found",
        )

    if student_grade.course_id != grade_data.course_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="course_id cannot be changed for an existing grade",
        )

    return update_grade(db, student_grade, grade_data.grade)


@router.delete("/{grade_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_grade(
    grade_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    ensure_student(current_user)
    student_grade = get_user_grade(db, current_user.id, grade_id)

    if student_grade is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grade not found",
        )

    delete_grade(db, current_user.id, grade_id)


@router.post("/bulk", response_model=list[GradeResponse])
def bulk_update_my_grades(
    request: BulkGradeRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list:
    ensure_student(current_user)
    for grade_data in request.grades:
        ensure_course_exists(db, grade_data.course_id)

    return bulk_update_grades(db, current_user.id, request.grades)
