import json
import math
import time
from dataclasses import dataclass

import numpy as np
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.neighbors import KNeighborsRegressor
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.course import Course
from app.models.grade import StudentGrade
from app.models.historical import HistoricalGrade, HistoricalStudent
from app.models.prediction import Prediction
from app.models.settings import SystemSetting

DEFAULT_K = 5
MIN_USER_GRADES = 3


@dataclass
class GradeMatrixCache:
    matrix: np.ndarray
    student_id_to_row: dict[int, int]
    course_id_to_col: dict[int, int]


_grade_matrix_cache: GradeMatrixCache | None = None


def build_grade_matrix(db: Session) -> tuple[np.ndarray, dict, dict]:
    """Build and cache the historical student-course grade matrix."""
    global _grade_matrix_cache

    if _grade_matrix_cache is not None:
        return (
            _grade_matrix_cache.matrix,
            _grade_matrix_cache.student_id_to_row,
            _grade_matrix_cache.course_id_to_col,
        )

    historical_students = list(
        db.scalars(select(HistoricalStudent).order_by(HistoricalStudent.id))
    )
    courses = list(db.scalars(select(Course).order_by(Course.id)))
    student_id_to_row = {
        student.id: row for row, student in enumerate(historical_students)
    }
    course_id_to_col = {course.id: col for col, course in enumerate(courses)}
    matrix = np.full((len(historical_students), len(courses)), np.nan)

    historical_grades = db.scalars(select(HistoricalGrade))
    for historical_grade in historical_grades:
        row = student_id_to_row.get(historical_grade.historical_student_id)
        col = course_id_to_col.get(historical_grade.course_id)

        if row is not None and col is not None:
            matrix[row, col] = historical_grade.grade

    _grade_matrix_cache = GradeMatrixCache(matrix, student_id_to_row, course_id_to_col)
    return matrix, student_id_to_row, course_id_to_col


def rebuild_grade_matrix_cache(db: Session) -> tuple[np.ndarray, dict, dict]:
    """Force a rebuild of the cached historical grade matrix."""
    global _grade_matrix_cache

    _grade_matrix_cache = None
    return build_grade_matrix(db)


def predict_grade(
    db: Session,
    user_id: int,
    target_course_id: int,
    k: int | None = None,
) -> dict:
    """Predict a user's grade for one target course using KNN regression."""
    matrix, student_id_to_row, course_id_to_col = build_grade_matrix(db)
    k_value = _resolve_k(db, k)
    prediction = _predict_from_vector(
        matrix=matrix,
        student_id_to_row=student_id_to_row,
        course_id_to_col=course_id_to_col,
        user_vector=_build_user_vector(db, user_id, course_id_to_col),
        target_course_id=target_course_id,
        k=k_value,
        save_prediction=True,
        db=db,
        user_id=user_id,
    )
    return prediction


def recommend_top_courses(db: Session, user_id: int, n: int = 3) -> list[dict]:
    """Recommend top uncompleted courses with non-low prediction confidence."""
    completed_course_ids = set(
        db.scalars(select(StudentGrade.course_id).where(StudentGrade.user_id == user_id))
    )
    candidate_course_ids = list(
        db.scalars(
            select(Course.id)
            .where(Course.is_active.is_(True), Course.id.not_in(completed_course_ids))
            .order_by(Course.semester_recommended, Course.code)
        )
    )

    matrix, student_id_to_row, course_id_to_col = build_grade_matrix(db)
    k_value = _resolve_k(db, None)
    user_vector = _build_user_vector(db, user_id, course_id_to_col)

    recommendations: list[dict] = []

    for course_id in candidate_course_ids:
        try:
            prediction = _predict_from_vector(
                matrix=matrix,
                student_id_to_row=student_id_to_row,
                course_id_to_col=course_id_to_col,
                user_vector=user_vector,
                target_course_id=course_id,
                k=k_value,
                save_prediction=False,
            )
        except ValueError:
            continue

        if prediction["confidence"] == "low":
            continue

        course = db.get(Course, course_id)
        recommendations.append(
            {
                "course": course,
                "predicted_grade": prediction["predicted_grade"],
                "confidence": prediction["confidence"],
            }
        )

    recommendations.sort(key=lambda item: item["predicted_grade"], reverse=True)
    return recommendations[:n]


def evaluate_model(db: Session) -> dict:
    """Evaluate KNN prediction quality on historical records with an 80/20 split."""
    started_at = time.perf_counter()
    matrix, student_id_to_row, course_id_to_col = rebuild_grade_matrix_cache(db)

    student_ids = np.array(list(student_id_to_row.keys()))
    if len(student_ids) < 2:
        return {"mae": 0.0, "rmse": 0.0, "sample_size": 0, "runtime_ms": 0.0}

    rng = np.random.default_rng(42)
    shuffled_student_ids = rng.permutation(student_ids)
    split_index = max(1, int(len(shuffled_student_ids) * 0.8))
    train_student_ids = set(shuffled_student_ids[:split_index].tolist())
    test_student_ids = shuffled_student_ids[split_index:].tolist()
    train_student_id_list = list(train_student_ids)
    train_rows = [student_id_to_row[student_id] for student_id in train_student_id_list]
    test_rows = [student_id_to_row[student_id] for student_id in test_student_ids]
    train_matrix = matrix[train_rows, :]
    test_matrix = matrix[test_rows, :]
    actual_values: list[float] = []
    predicted_values: list[float] = []
    k_value = _resolve_k(db, None)

    for target_col in course_id_to_col.values():
        train_has_target = ~np.isnan(train_matrix[:, target_col])
        if not np.any(train_has_target):
            continue

        filtered_train = train_matrix[train_has_target]
        train_features = np.delete(filtered_train, target_col, axis=1)
        train_targets = filtered_train[:, target_col]
        effective_k = min(k_value, len(filtered_train))

        imputer = SimpleImputer(strategy="mean", keep_empty_features=True)
        imputed_train = imputer.fit_transform(train_features)
        model = KNeighborsRegressor(
            n_neighbors=effective_k,
            weights="distance",
            metric="euclidean",
        )
        model.fit(imputed_train, train_targets)

        test_has_target = ~np.isnan(test_matrix[:, target_col])
        test_features = np.delete(test_matrix, target_col, axis=1)
        enough_known_grades = np.count_nonzero(~np.isnan(test_features), axis=1) >= MIN_USER_GRADES
        eligible_mask = test_has_target & enough_known_grades

        if not np.any(eligible_mask):
            continue

        eligible_features = test_features[eligible_mask]
        eligible_actuals = test_matrix[eligible_mask, target_col]
        imputed_test = imputer.transform(eligible_features)
        predictions = model.predict(imputed_test)

        actual_values.extend(eligible_actuals.astype(float).tolist())
        predicted_values.extend(predictions.astype(float).tolist())

    runtime_ms = (time.perf_counter() - started_at) * 1000
    if not actual_values:
        return {"mae": 0.0, "rmse": 0.0, "sample_size": 0, "runtime_ms": runtime_ms}

    mse = mean_squared_error(actual_values, predicted_values)
    return {
        "mae": float(mean_absolute_error(actual_values, predicted_values)),
        "rmse": float(math.sqrt(mse)),
        "sample_size": len(actual_values),
        "runtime_ms": runtime_ms,
    }


def _resolve_k(db: Session, k: int | None) -> int:
    if k is not None:
        return max(1, int(k))

    setting = db.get(SystemSetting, "knn_k")
    if setting is None:
        return DEFAULT_K

    try:
        return max(1, int(setting.value))
    except ValueError:
        return DEFAULT_K


def _build_user_vector(
    db: Session,
    user_id: int,
    course_id_to_col: dict[int, int],
) -> np.ndarray:
    user_vector = np.full(len(course_id_to_col), np.nan)
    grades = db.scalars(select(StudentGrade).where(StudentGrade.user_id == user_id))

    for grade in grades:
        col = course_id_to_col.get(grade.course_id)
        if col is not None:
            user_vector[col] = grade.grade

    return user_vector


def _predict_from_vector(
    *,
    matrix: np.ndarray,
    student_id_to_row: dict[int, int],
    course_id_to_col: dict[int, int],
    user_vector: np.ndarray,
    target_course_id: int,
    k: int,
    save_prediction: bool,
    db: Session | None = None,
    user_id: int | None = None,
) -> dict:
    target_col = course_id_to_col.get(target_course_id)

    if target_col is None:
        raise ValueError("Course not found in historical matrix")

    known_grade_count = int(np.count_nonzero(~np.isnan(user_vector)))
    if known_grade_count < MIN_USER_GRADES:
        raise ValueError("Not enough grades")

    has_target_grade = ~np.isnan(matrix[:, target_col])
    filtered_matrix = matrix[has_target_grade]
    filtered_student_ids = [
        student_id
        for student_id, row in student_id_to_row.items()
        if has_target_grade[row]
    ]

    if filtered_matrix.size == 0:
        raise ValueError("No historical grades for target course")

    feature_matrix = np.delete(filtered_matrix, target_col, axis=1)
    target_grades = filtered_matrix[:, target_col]
    user_features = np.delete(user_vector, target_col).reshape(1, -1)
    imputer = SimpleImputer(strategy="mean", keep_empty_features=True)
    imputed_features = imputer.fit_transform(feature_matrix)
    imputed_user_features = imputer.transform(user_features)
    effective_k = min(k, len(filtered_matrix))
    model = KNeighborsRegressor(
        n_neighbors=effective_k,
        weights="distance",
        metric="euclidean",
    )
    model.fit(imputed_features, target_grades)
    predicted_grade = float(model.predict(imputed_user_features)[0])
    distances, neighbor_indices = model.kneighbors(imputed_user_features)
    neighbor_dicts = _build_neighbor_dicts(
        filtered_matrix=filtered_matrix,
        filtered_student_ids=filtered_student_ids,
        neighbor_indices=neighbor_indices[0],
        distances=distances[0],
        target_col=target_col,
    )
    confidence = _compute_confidence(
        user_vector=user_vector,
        filtered_matrix=filtered_matrix,
        neighbor_indices=neighbor_indices[0],
        target_col=target_col,
    )
    result = {
        "predicted_grade": round(predicted_grade, 2),
        "confidence": confidence,
        "k_value": effective_k,
        "neighbors": neighbor_dicts,
    }

    if save_prediction:
        if db is None or user_id is None:
            raise ValueError("Database session and user_id are required to save")

        prediction = Prediction(
            user_id=user_id,
            course_id=target_course_id,
            predicted_grade=result["predicted_grade"],
            confidence=confidence,
            k_value=effective_k,
            neighbor_ids=json.dumps([neighbor["id"] for neighbor in neighbor_dicts]),
        )
        db.add(prediction)
        db.commit()
        db.refresh(prediction)
        result["id"] = prediction.id

    return result


def _build_neighbor_dicts(
    *,
    filtered_matrix: np.ndarray,
    filtered_student_ids: list[int],
    neighbor_indices: np.ndarray,
    distances: np.ndarray,
    target_col: int,
) -> list[dict]:
    neighbors: list[dict] = []

    for index, distance in zip(neighbor_indices, distances, strict=True):
        row = filtered_matrix[int(index)]
        neighbors.append(
            {
                "id": filtered_student_ids[int(index)],
                "avg_grade": round(float(np.nanmean(row)), 2),
                "target_grade": int(row[target_col]),
                "distance": round(float(distance), 4),
            }
        )

    return neighbors


def _compute_confidence(
    *,
    user_vector: np.ndarray,
    filtered_matrix: np.ndarray,
    neighbor_indices: np.ndarray,
    target_col: int,
) -> str:
    neighbor_rows = filtered_matrix[neighbor_indices]
    neighbor_targets = neighbor_rows[:, target_col]
    target_std = float(np.std(neighbor_targets))
    user_known = ~np.isnan(user_vector)
    user_known[target_col] = False
    overlap_counts = np.sum(~np.isnan(neighbor_rows[:, user_known]), axis=1)
    avg_overlap = float(np.mean(overlap_counts)) if len(overlap_counts) else 0.0

    if target_std <= 6 and avg_overlap >= 5:
        return "high"

    if target_std <= 12 and avg_overlap >= 3:
        return "medium"

    return "low"
