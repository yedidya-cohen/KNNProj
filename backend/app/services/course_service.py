from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.course import Course
from app.schemas.course import CourseCreate


def get_courses(
    db: Session,
    department: str | None = None,
    search: str | None = None,
    include_inactive: bool = False,
) -> list[Course]:
    statement = select(Course)

    if not include_inactive:
        statement = statement.where(Course.is_active.is_(True))

    if department:
        statement = statement.where(Course.department == department)

    if search:
        search_term = f"%{search}%"
        statement = statement.where(
            Course.name.ilike(search_term) | Course.code.ilike(search_term)
        )

    return list(db.scalars(statement.order_by(Course.semester_recommended, Course.code)))


def get_course(db: Session, course_id: int) -> Course | None:
    return db.get(Course, course_id)


def get_active_course(db: Session, course_id: int) -> Course | None:
    course = get_course(db, course_id)

    if course is None or not course.is_active:
        return None

    return course


def create_course(db: Session, course_data: CourseCreate) -> Course:
    course = Course(**course_data.model_dump())
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


def update_course(
    db: Session,
    course: Course,
    course_data: CourseCreate,
) -> Course:
    for key, value in course_data.model_dump().items():
        setattr(course, key, value)

    db.commit()
    db.refresh(course)
    return course


def delete_course(db: Session, course: Course) -> Course:
    course.is_active = False
    db.commit()
    db.refresh(course)
    return course
