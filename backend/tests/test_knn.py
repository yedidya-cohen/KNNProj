from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.course import Course
from app.models.grade import StudentGrade
from app.models.historical import HistoricalGrade, HistoricalStudent
from app.models.settings import SystemSetting
from app.models.user import User, UserRole
from app.services.knn_service import predict_grade, rebuild_grade_matrix_cache


def test_knn_predicts_grade_happy_path() -> None:
    engine = create_engine("sqlite:///:memory:")
    testing_session = sessionmaker(bind=engine)
    Base.metadata.create_all(bind=engine)

    with testing_session() as db:
        courses = [
            Course(
                code=f"TST{i}",
                name=f"Test Course {i}",
                credits=3.0,
                semester_recommended=i,
                department="computer_science",
                is_active=True,
            )
            for i in range(1, 5)
        ]
        user = User(
            username="knn_student",
            password_hash="hash",
            full_name="KNN Student",
            role=UserRole.STUDENT,
            department="computer_science",
        )
        db.add_all(courses + [user, SystemSetting(key="knn_k", value="2")])
        db.flush()

        historical_rows = [
            [80, 85, 90, 88],
            [70, 75, 78, 74],
            [92, 94, 96, 95],
            [60, 62, 64, 61],
        ]
        for row in historical_rows:
            student = HistoricalStudent(
                graduation_year=2024,
                department="computer_science",
            )
            student.grades = [
                HistoricalGrade(course=course, grade=grade)
                for course, grade in zip(courses, row, strict=True)
            ]
            db.add(student)

        db.flush()
        db.add_all(
            [
                StudentGrade(user_id=user.id, course_id=courses[0].id, grade=82),
                StudentGrade(user_id=user.id, course_id=courses[1].id, grade=86),
                StudentGrade(user_id=user.id, course_id=courses[2].id, grade=89),
            ]
        )
        db.commit()
        rebuild_grade_matrix_cache(db)

        result = predict_grade(db, user.id, courses[3].id)

    assert 0 <= result["predicted_grade"] <= 100
    assert result["k_value"] == 2
    assert result["confidence"] in {"high", "medium", "low"}
    assert len(result["neighbors"]) == 2
