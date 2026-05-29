# Architecture

## High-Level View

```mermaid
flowchart LR
    Browser["React + Vite Frontend"] --> API["FastAPI Backend"]
    API --> Auth["JWT Auth + Role Dependencies"]
    API --> DB["SQLite Database"]
    API --> KNN["KNN Prediction Service"]
    KNN --> DB
```

## Backend Layers

- Routers expose HTTP endpoints under `/api/v1`.
- Schemas define Pydantic request and response DTOs.
- Services contain business logic and database queries.
- Models define SQLAlchemy 2.0 ORM entities.
- Core modules provide security, JWT handling, and FastAPI dependencies.
- Scripts provide local operational tasks such as synthetic data seeding.

## Runtime Flow

1. The frontend sends requests to the FastAPI backend.
2. Protected endpoints use bearer tokens with `get_current_user`.
3. Admin endpoints additionally use `require_admin`.
4. Routers validate payloads with Pydantic schemas.
5. Services read/write SQLAlchemy ORM models through a request-scoped DB session.
6. Prediction routes call the KNN service, which reads historical data and saves prediction results.

## Authentication Architecture

```mermaid
sequenceDiagram
    participant Client
    participant AuthRouter
    participant AuthService
    participant DB

    Client->>AuthRouter: POST /api/v1/auth/login
    AuthRouter->>AuthService: authenticate_user(username, password)
    AuthService->>DB: Load User by username
    AuthService-->>AuthRouter: User or None
    AuthRouter-->>Client: JWT access_token
    Client->>AuthRouter: GET /api/v1/auth/me with Bearer token
    AuthRouter->>DB: Resolve current user from token subject
    AuthRouter-->>Client: UserResponse
```

## Prediction Architecture

```mermaid
flowchart TD
    Request["Student prediction request"] --> UserGrades["Load current student grades"]
    UserGrades --> Matrix["Build or reuse historical grade matrix"]
    Matrix --> Filter["Filter students with target-course grade"]
    Filter --> Impute["Mean-impute missing values"]
    Impute --> Train["Fit KNeighborsRegressor"]
    Train --> Predict["Predict grade and neighbors"]
    Predict --> Confidence["Compute confidence"]
    Confidence --> Save["Save Prediction record"]
    Save --> Response["Return prediction response"]
```

## Database

The database is SQLite at `./grade_prediction.db`. SQLAlchemy creates tables at app startup using `Base.metadata.create_all(bind=engine)`.

Main tables:

- `users`
- `courses`
- `student_grades`
- `historical_students`
- `historical_grades`
- `predictions`
- `system_settings`

## Frontend Architecture Status

The frontend currently has a Vite/React scaffold with placeholder pages and API helper files. The planned frontend will use:

- React Router for page routing.
- Axios API helpers for backend calls.
- Auth context for token/user state.
- Bootstrap 5 with RTL styling.
- Separate page stages to avoid mixing student and admin screens.

## UML Files

The files in `docs/uml` currently exist as placeholder PNGs only. They are not real UML diagrams yet and should be regenerated later from the implemented system design.
