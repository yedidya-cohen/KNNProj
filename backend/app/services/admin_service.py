from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.course import Course
from app.models.grade import StudentGrade
from app.models.historical import HistoricalGrade, HistoricalStudent
from app.models.prediction import Prediction
from app.models.settings import SystemSetting
from app.models.user import User
from app.schemas.admin import HistoricalStudentCreate


def get_dashboard_stats(db: Session) -> dict:
    total_users = db.scalar(select(func.count(User.id))) or 0
    total_predictions = db.scalar(select(func.count(Prediction.id))) or 0
    avg_historical_grade = db.scalar(select(func.avg(HistoricalGrade.grade)))
    prediction_count = func.count(Prediction.id).label("prediction_count")
    most_predicted_statement = (
        select(
            Course.id,
            Course.code,
            Course.name,
            prediction_count,
        )
        .join(Prediction, Prediction.course_id == Course.id)
        .group_by(Course.id, Course.code, Course.name)
        .order_by(prediction_count.desc())
        .limit(5)
    )
    most_predicted_courses = [
        {
            "course_id": course_id,
            "code": code,
            "name": name,
            "prediction_count": prediction_count,
        }
        for course_id, code, name, prediction_count in db.execute(
            most_predicted_statement
        )
    ]

    return {
        "total_users": total_users,
        "total_predictions": total_predictions,
        "avg_historical_grade": (
            round(float(avg_historical_grade), 2)
            if avg_historical_grade is not None
            else None
        ),
        "most_predicted_courses": most_predicted_courses,
    }


def update_system_setting(
    db: Session,
    key: str,
    value: str,
    admin_id: int,
) -> SystemSetting:
    setting = db.get(SystemSetting, key)

    if setting is None:
        setting = SystemSetting(key=key, value=value, updated_by=admin_id)
        db.add(setting)
    else:
        setting.value = value
        setting.updated_by = admin_id

    db.commit()
    db.refresh(setting)
    return setting


def get_system_setting(db: Session, key: str) -> SystemSetting | None:
    return db.get(SystemSetting, key)


def get_historical_student_summaries(db: Session) -> list[dict]:
    statement = (
        select(
            HistoricalStudent.id,
            HistoricalStudent.graduation_year,
            HistoricalStudent.department,
            HistoricalStudent.created_at,
            func.count(HistoricalGrade.id).label("grade_count"),
            func.avg(HistoricalGrade.grade).label("avg_grade"),
        )
        .outerjoin(
            HistoricalGrade,
            HistoricalGrade.historical_student_id == HistoricalStudent.id,
        )
        .group_by(HistoricalStudent.id)
        .order_by(HistoricalStudent.id)
    )

    return [
        {
            "id": student_id,
            "graduation_year": graduation_year,
            "department": department,
            "created_at": created_at,
            "grade_count": grade_count,
            "avg_grade": round(float(avg_grade), 2) if avg_grade is not None else None,
        }
        for (
            student_id,
            graduation_year,
            department,
            created_at,
            grade_count,
            avg_grade,
        ) in db.execute(statement)
    ]


def get_historical_student_summary(db: Session, student_id: int) -> dict | None:
    statement = (
        select(
            HistoricalStudent.id,
            HistoricalStudent.graduation_year,
            HistoricalStudent.department,
            HistoricalStudent.created_at,
            func.count(HistoricalGrade.id).label("grade_count"),
            func.avg(HistoricalGrade.grade).label("avg_grade"),
        )
        .outerjoin(
            HistoricalGrade,
            HistoricalGrade.historical_student_id == HistoricalStudent.id,
        )
        .where(HistoricalStudent.id == student_id)
        .group_by(HistoricalStudent.id)
    )
    row = db.execute(statement).one_or_none()

    if row is None:
        return None

    (
        student_id,
        graduation_year,
        department,
        created_at,
        grade_count,
        avg_grade,
    ) = row
    return {
        "id": student_id,
        "graduation_year": graduation_year,
        "department": department,
        "created_at": created_at,
        "grade_count": grade_count,
        "avg_grade": round(float(avg_grade), 2) if avg_grade is not None else None,
    }


def create_historical_student(
    db: Session,
    student_data: HistoricalStudentCreate,
) -> HistoricalStudent:
    requested_course_ids = {grade.course_id for grade in student_data.grades}
    existing_course_ids = set(
        db.scalars(select(Course.id).where(Course.id.in_(requested_course_ids)))
    )
    missing_course_ids = requested_course_ids - existing_course_ids

    if missing_course_ids:
        raise ValueError(f"Unknown course ids: {sorted(missing_course_ids)}")

    student = HistoricalStudent(
        graduation_year=student_data.graduation_year,
        department=student_data.department,
    )
    student.grades = [
        HistoricalGrade(course_id=grade.course_id, grade=grade.grade)
        for grade in student_data.grades
    ]
    db.add(student)
    db.commit()
    db.refresh(student)
    return student
