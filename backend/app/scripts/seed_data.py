import random
from dataclasses import dataclass

from faker import Faker
from sqlalchemy.orm import Session

from app import models
from app.core.security import hash_password
from app.database import Base, SessionLocal, engine
from app.models.course import Course
from app.models.historical import HistoricalGrade, HistoricalStudent
from app.models.settings import SystemSetting
from app.models.user import User, UserRole

DEPARTMENT = "computer_science"
STUDENT_COUNT = 1000


@dataclass(frozen=True)
class CourseSeed:
    name: str
    credits: float
    semester: int


# Course names are based on the Tel-Hai computer science 2025-2026 yearbook.
COURSES: list[CourseSeed] = [
    CourseSeed("מבוא למדעי המחשב", 4.0, 1),
    CourseSeed("מתמטיקה דיסקרטית", 4.0, 1),
    CourseSeed("אלגברה ליניארית", 4.0, 1),
    CourseSeed("מבוא ללינוקס", 3.0, 1),
    CourseSeed("מבוא לתכנות מערכות", 4.0, 2),
    CourseSeed("תכנות מונחה עצמים וג'אווה", 4.0, 2),
    CourseSeed("חדו\"א 1", 4.0, 2),
    CourseSeed("חדו\"א 2", 4.0, 3),
    CourseSeed("פרקים במבני נתונים", 4.0, 3),
    CourseSeed("פרקים במבני נתונים - מעבדה", 3.0, 3),
    CourseSeed("אלגוריתמים 1", 4.0, 4),
    CourseSeed("מערכות הפעלה", 4.0, 4),
    CourseSeed("לוגיקה למדעי המחשב", 3.0, 4),
    CourseSeed("תכנות בשפת ++C", 3.5, 5),
    CourseSeed("רשתות תקשורת מחשבים", 3.5, 6),
    CourseSeed("מערכות מסדי נתונים", 3.5, 6),
    CourseSeed("מבוא לבינה מלאכותית", 3.5, 6),
    CourseSeed("למידה חישובית", 3.5, 6),
    CourseSeed("מבוא למדעי הנתונים", 3.5, 6),
    CourseSeed("מבוא לקריפטולוגיה", 3.5, 6),
    CourseSeed("מבוא לעיבוד אותות", 3.5, 6),
    CourseSeed("ראייה ממוחשבת", 3.5, 7),
    CourseSeed("מבוא לעיבוד תמונות", 3.5, 7),
    CourseSeed("ארכיטקטורת מחשבים", 3.5, 7),
    CourseSeed("מערכות זמן אמת", 3.5, 7),
    CourseSeed("רשתות מהירות", 3.5, 7),
    CourseSeed("מבוא לבינה חישובית", 3.5, 7),
    CourseSeed("עקרונות שפות תכנות", 3.5, 8),
    CourseSeed("מבנה קומפיילרים", 3.5, 8),
    CourseSeed("תורת המשחקים האלגוריתמית", 3.0, 8),
]


def clamp_grade(value: float) -> int:
    return max(0, min(100, round(value)))


def confirm_reset() -> None:
    answer = input(
        "This will DROP and recreate all database tables in ./grade_prediction.db. "
        "Type 'yes' to continue: "
    )

    if answer.strip().lower() != "yes":
        raise SystemExit("Seed cancelled. Database was not changed.")


def reset_database() -> None:
    _ = models
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def create_courses(session: Session) -> list[Course]:
    courses: list[Course] = []

    for index, course_seed in enumerate(COURSES, start=101):
        course = Course(
            code=f"CS{index}",
            name=course_seed.name,
            description=f"קורס סינתטי המבוסס על תוכנית מדעי המחשב: {course_seed.name}",
            credits=course_seed.credits,
            semester_recommended=course_seed.semester,
            department=DEPARTMENT,
            is_active=True,
        )
        session.add(course)
        courses.append(course)

    session.flush()
    print(f"Created {len(courses)} courses.")
    return courses


def create_admin_user(session: Session, faker: Faker) -> User:
    admin = User(
        username="admin",
        password_hash=hash_password("admin123"),
        full_name="Admin",
        role=UserRole.ADMIN,
        department=DEPARTMENT,
    )
    session.add(admin)
    session.flush()
    print("Created default admin user: admin / admin123")
    return admin


def create_settings(session: Session, admin: User) -> None:
    session.add(
        SystemSetting(
            key="knn_k",
            value="5",
            updated_by=admin.id,
        )
    )
    print('Created default system setting: knn_k="5"')


def create_historical_students(session: Session, courses: list[Course]) -> None:
    min_courses = round(len(courses) * 0.70)
    max_courses = round(len(courses) * 0.90)

    for student_number in range(1, STUDENT_COUNT + 1):
        talent = random.uniform(60, 95)
        course_count = random.randint(min_courses, max_courses)
        selected_courses = random.sample(courses, course_count)
        student = HistoricalStudent(
            graduation_year=random.randint(2020, 2026),
            department=DEPARTMENT,
        )

        student.grades = [
            HistoricalGrade(
                course=course,
                grade=clamp_grade(talent + random.uniform(-10, 10)),
            )
            for course in selected_courses
        ]
        session.add(student)

        if student_number % 100 == 0:
            session.flush()
            print(f"Created {student_number} historical students...")


def seed_database() -> dict[str, int]:
    Faker.seed(42)
    random.seed(42)
    faker = Faker("he_IL")

    reset_database()

    with SessionLocal() as session:
        courses = create_courses(session)
        admin = create_admin_user(session, faker)
        create_settings(session, admin)
        create_historical_students(session, courses)
        session.commit()
        from app.services.knn_service import rebuild_grade_matrix_cache

        rebuild_grade_matrix_cache(session)
        return {
            "courses": session.query(Course).count(),
            "historical_students": session.query(HistoricalStudent).count(),
            "historical_grades": session.query(HistoricalGrade).count(),
            "users": session.query(User).count(),
            "settings": session.query(SystemSetting).count(),
        }


def main() -> None:
    confirm_reset()
    seed_database()

    print("Seed completed successfully.")


if __name__ == "__main__":
    main()
