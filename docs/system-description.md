# System Description

## Overview

The Course Grade Prediction System helps computer science students estimate future course grades from their current grades and historical student performance. The system combines a FastAPI backend, SQLite database, SQLAlchemy 2.0 models, JWT authentication, and a KNN-based prediction service.

The backend is implemented through the `Admin` branch. The frontend is still scaffolded and planned for later implementation.

## Goals

- Allow students to register, log in, manage their completed course grades, and request grade predictions.
- Use historical student grade data to predict expected grades for courses the current student has not completed.
- Recommend high-potential future courses based on predicted grades and confidence.
- Allow admins to manage courses, inspect historical data, update system settings, seed synthetic data, and review model statistics.

## Main Actors

- Student: Registers, logs in, enters grades, requests predictions, views recommendations, and reviews prediction history.
- Admin: Logs in with admin role, manages course data, views users and historical students, updates system settings such as `knn_k`, runs seed data generation, and evaluates the KNN model.

## Core Capabilities

- Authentication with JWT bearer tokens.
- Password hashing with `passlib[bcrypt]`.
- Role-based authorization for student and admin actions.
- Course catalog CRUD with admin-only write access.
- Student grade upsert, bulk update, and delete.
- KNN prediction using historical grades.
- Prediction history per student.
- Top-course recommendations.
- Admin dashboard metrics.
- Synthetic data seeding.
- Model evaluation with MAE and RMSE.

## Data Model Summary

- `User`: Stores account data, role (`student` or `admin`), department, and password hash.
- `Course`: Stores course code, name, description, credits, recommended semester, department, and active status.
- `StudentGrade`: Stores one grade per `(user_id, course_id)` with a `0-100` grade constraint.
- `HistoricalStudent`: Represents an anonymized historical student.
- `HistoricalGrade`: Stores historical grades used by the KNN model.
- `Prediction`: Stores saved prediction results, confidence, K value, and neighbor IDs.
- `SystemSetting`: Stores key/value configuration such as `knn_k`.

## Prediction Logic

The prediction service builds a matrix of historical students by courses. Missing historical grades are represented as `NaN`. For a prediction:

1. The current student's known grades are converted into the same course vector.
2. The target course column is removed from the feature matrix.
3. Historical rows are filtered to students who have a known grade in the target course.
4. Missing feature values are filled with `SimpleImputer(strategy="mean")`.
5. `KNeighborsRegressor` predicts the target grade with distance weighting and Euclidean distance.
6. Confidence is calculated from neighbor target-grade standard deviation and overlap with the student's known grades.
7. The prediction is saved to the database.

## Current Limitations

- The frontend is not implemented yet beyond placeholders.
- The UML PNG files are placeholders and do not contain useful diagrams yet.
- The project does not currently use Alembic migrations; tables are created with `Base.metadata.create_all`.
- The seed endpoint is powerful because it recreates the synthetic database and should remain admin-only.
