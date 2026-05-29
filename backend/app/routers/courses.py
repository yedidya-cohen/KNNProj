from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_admin
from app.database import get_db
from app.models.user import User
from app.schemas.course import CourseCreate, CourseResponse
from app.services.course_service import (
    create_course,
    delete_course,
    get_active_course,
    get_course,
    get_courses,
    update_course,
)

router = APIRouter(prefix="/api/v1/courses", tags=["courses"])


@router.get("", response_model=list[CourseResponse])
def list_courses(
    _current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    department: Annotated[str | None, Query()] = None,
    search: Annotated[str | None, Query()] = None,
) -> list:
    return get_courses(db, department=department, search=search)


@router.get("/{course_id}", response_model=CourseResponse)
def read_course(
    course_id: int,
    _current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    course = get_active_course(db, course_id)

    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )

    return course


@router.post("", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
def create_course_endpoint(
    course_data: CourseCreate,
    _admin: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    try:
        return create_course(db, course_data)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Course code already exists",
        ) from exc


@router.put("/{course_id}", response_model=CourseResponse)
def update_course_endpoint(
    course_id: int,
    course_data: CourseCreate,
    _admin: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    course = get_course(db, course_id)

    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )

    try:
        return update_course(db, course, course_data)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Course code already exists",
        ) from exc


@router.delete("/{course_id}", response_model=CourseResponse)
def delete_course_endpoint(
    course_id: int,
    _admin: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    course = get_course(db, course_id)

    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )

    return delete_course(db, course)
