# Work Process

## Branch History

- `DBModels`: SQLAlchemy database setup and models.
- `AuthSystem`: JWT authentication and protected-user dependencies.
- `coursesEndpoints`: course CRUD endpoints and student grade endpoints.
- `KNN_Model`: KNN prediction service, prediction schemas/routes, and KNN test.

## Database Layer

The backend uses SQLAlchemy 2.0 with SQLite at `./grade_prediction.db`. The core database objects are defined in `backend/app/database.py`:

- `engine`: SQLite engine configured from `settings.database_url`.
- `SessionLocal`: request/session factory.
- `Base`: declarative model base.
- `get_db`: FastAPI dependency that yields a database session.

The app startup lifespan in `backend/app/main.py` imports all models and calls `Base.metadata.create_all(bind=engine)` so missing tables are created automatically.

## Models

The main ORM entities live in `backend/app/models`:

- `User`: username, password hash, role, department, and relationships to grades/predictions/settings.
- `Course`: course catalog row with code, name, credits, semester, department, and `is_active`.
- `StudentGrade`: one student grade per `(user_id, course_id)`, with grade constrained to `0-100`.
- `HistoricalStudent` and `HistoricalGrade`: training data for the KNN model.
- `Prediction`: saved prediction result with predicted grade, confidence, K value, and neighbor IDs serialized as JSON text.
- `SystemSetting`: key/value settings such as `knn_k`.

## Seed Data

`python -m app.scripts.seed_data` drops and recreates the database after confirmation. It seeds:

- 30 computer science courses using Hebrew course names based on Tel-Hai's 2025-2026 CS yearbook.
- 1000 historical students in `computer_science`.
- 70-90% course coverage per historical student.
- Synthetic grades from a per-student talent score plus course-level random noise.
- Default admin user `admin / admin123`.
- Default setting `knn_k = 5`.

## Authentication Flow

Authentication is implemented with `python-jose` and `passlib[bcrypt]`.

- `backend/app/core/security.py` hashes and verifies passwords, creates JWTs, and decodes JWTs.
- JWTs use `HS256` and default to 24 hours via `JWT_EXPIRE_MINUTES=1440`.
- `backend/app/core/dependencies.py` defines `get_current_user` and `require_admin`.
- `POST /api/v1/auth/register` creates student users.
- `POST /api/v1/auth/login` accepts form `username` and `password`, then returns a bearer token.
- `GET /api/v1/auth/me` returns the authenticated user.

The JWT `sub` claim stores the username. API responses never expose `password_hash`.

## Course And Grade Flow

Courses are handled by `backend/app/services/course_service.py` and `backend/app/routers/courses.py`.

- `GET /api/v1/courses` lists active courses and supports `department` and `search` filters.
- `GET /api/v1/courses/{id}` returns one active course.
- `POST /api/v1/courses` creates a course and requires admin.
- `PUT /api/v1/courses/{id}` updates a course and requires admin.
- `DELETE /api/v1/courses/{id}` performs a soft delete by setting `is_active=False`.

Student grades are handled by `backend/app/services/grade_service.py` and `backend/app/routers/grades.py`.

- `GET /api/v1/grades/my` returns the current student's grades.
- `POST /api/v1/grades/` upserts one grade.
- `PUT /api/v1/grades/{id}` updates an owned grade and rejects course changes.
- `DELETE /api/v1/grades/{id}` deletes an owned grade.
- `POST /api/v1/grades/bulk` upserts multiple grades.

Grade input is validated to `0-100`. Student grade routes reject admin users and enforce ownership.

## KNN Prediction Flow

The KNN system is implemented in `backend/app/services/knn_service.py`.

### Matrix Cache

`build_grade_matrix(db)` builds a matrix shaped `[N_historical_students x N_courses]`. Rows are historical students, columns are courses, and missing historical grades are stored as `np.nan`. It returns:

- the matrix,
- `student_id_to_row`,
- `course_id_to_col`.

The matrix is cached in memory after the first build for prediction performance. `rebuild_grade_matrix_cache(db)` clears and rebuilds the cache when fresh historical data is needed.

### Single Prediction

`predict_grade(db, user_id, target_course_id, k=None)`:

1. Reads the cached grade matrix.
2. Resolves `k` from the argument or `system_settings.knn_k`, defaulting to `5`.
3. Builds the current user's grade vector from `student_grades`, using `np.nan` for missing courses.
4. Requires at least 3 known user grades.
5. Filters historical rows to students who have a grade in the target course.
6. Removes the target course column from training features.
7. Uses `SimpleImputer(strategy="mean")` to fill missing values in historical features and the user vector.
8. Fits `KNeighborsRegressor(weights="distance", metric="euclidean")`.
9. Predicts the target grade.
10. Retrieves nearest neighbors with `kneighbors()`.
11. Computes confidence from neighbor target-grade standard deviation and average overlap with the user's known grades.
12. Saves a `Prediction` row and returns predicted grade, confidence, K value, and neighbor details.

Neighbor details include historical student ID, average grade, target course grade, and distance.

### Recommendations

`recommend_top_courses(db, user_id, n=3)` predicts every active course the student has not completed, filters out `low` confidence results, sorts by predicted grade descending, and returns the top `n`.

### Model Evaluation

`evaluate_model(db)` rebuilds the matrix, splits historical students 80/20, predicts held-out historical grades using only the training students, and returns MAE, RMSE, sample size, and runtime in milliseconds.

## Prediction API

Prediction routes live in `backend/app/routers/predictions.py`:

- `POST /api/v1/predictions/predict`: student-only single-course prediction.
- `GET /api/v1/predictions/recommend-top`: student-only top recommendations.
- `GET /api/v1/predictions/my-history`: student-only saved prediction history.
- `GET /api/v1/predictions/{id}`: reads one owned prediction.

Prediction schemas live in `backend/app/schemas/prediction.py` and define request/response objects for single predictions, neighbor info, recommendations, model stats, and prediction history.

## Tests

`backend/tests/test_knn.py` contains a happy-path KNN test. It creates a small test database state, inserts historical students and grades, gives a student three completed grades, rebuilds the matrix cache, and verifies that `predict_grade` returns a bounded prediction with two neighbors.
