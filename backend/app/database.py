from collections.abc import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

connect_args = (
    {"check_same_thread": False}
    if settings.database_url.startswith("sqlite")
    else {}
)

engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_seed_marker_columns() -> None:
    if not settings.database_url.startswith("sqlite"):
        return

    inspector = inspect(engine)
    tables = set(inspector.get_table_names())

    with engine.begin() as connection:
        if "courses" in tables:
            course_columns = {column["name"] for column in inspector.get_columns("courses")}
            if "is_seed_data" not in course_columns:
                connection.execute(
                    text("ALTER TABLE courses ADD COLUMN is_seed_data BOOLEAN NOT NULL DEFAULT 0")
                )
                connection.execute(
                    text("UPDATE courses SET is_seed_data = 1 WHERE code LIKE 'CS%'")
                )

        if "historical_students" in tables:
            historical_columns = {
                column["name"] for column in inspector.get_columns("historical_students")
            }
            if "is_seed_data" not in historical_columns:
                connection.execute(
                    text(
                        "ALTER TABLE historical_students "
                        "ADD COLUMN is_seed_data BOOLEAN NOT NULL DEFAULT 0"
                    )
                )
                connection.execute(text("UPDATE historical_students SET is_seed_data = 1"))
