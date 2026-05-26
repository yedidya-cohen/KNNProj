# Architecture

## High-Level View

```mermaid
flowchart LR
    Browser["React Frontend"] --> API["FastAPI Backend"]
    API --> DB["SQLite Database"]
    API --> ML["KNN Prediction Service"]
```

## Backend Layers

- Routers expose HTTP endpoints.
- Schemas validate request and response payloads.
- Services contain business logic.
- Models define SQLAlchemy ORM entities.
- Core modules hold shared infrastructure such as authentication dependencies.

