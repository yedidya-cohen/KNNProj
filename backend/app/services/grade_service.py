from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.grade import StudentGrade
from app.schemas.grade import GradeCreate


def get_user_grades(db: Session, user_id: int) -> list[StudentGrade]:
    statement = (
        select(StudentGrade)
        .options(selectinload(StudentGrade.course))
        .where(StudentGrade.user_id == user_id)
        .order_by(StudentGrade.created_at.desc())
    )
    return list(db.scalars(statement))


def get_user_grade(db: Session, user_id: int, grade_id: int) -> StudentGrade | None:
    statement = (
        select(StudentGrade)
        .options(selectinload(StudentGrade.course))
        .where(StudentGrade.id == grade_id, StudentGrade.user_id == user_id)
    )
    return db.scalar(statement)


def add_or_update_grade(
    db: Session,
    user_id: int,
    course_id: int,
    grade: int,
) -> StudentGrade:
    statement = select(StudentGrade).where(
        StudentGrade.user_id == user_id,
        StudentGrade.course_id == course_id,
    )
    student_grade = db.scalar(statement)

    if student_grade is None:
        student_grade = StudentGrade(
            user_id=user_id,
            course_id=course_id,
            grade=grade,
        )
        db.add(student_grade)
    else:
        student_grade.grade = grade

    db.commit()
    db.refresh(student_grade)
    return student_grade


def bulk_update_grades(
    db: Session,
    user_id: int,
    grades_list: list[GradeCreate],
) -> list[StudentGrade]:
    updated_grades: list[StudentGrade] = []

    for grade_data in grades_list:
        updated_grades.append(
            add_or_update_grade(
                db,
                user_id=user_id,
                course_id=grade_data.course_id,
                grade=grade_data.grade,
            )
        )

    return updated_grades


def update_grade(
    db: Session,
    student_grade: StudentGrade,
    grade: int,
) -> StudentGrade:
    student_grade.grade = grade
    db.commit()
    db.refresh(student_grade)
    return student_grade


def delete_grade(db: Session, user_id: int, grade_id: int) -> None:
    student_grade = get_user_grade(db, user_id, grade_id)

    if student_grade is None:
        return None

    db.delete(student_grade)
    db.commit()
    return None
