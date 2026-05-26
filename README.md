# Course Grade Prediction System

Monorepo for a course grade prediction system with a FastAPI backend and a React/Vite frontend.

## Student Details

- Name: TODO
- ID: TODO
- Course: TODO

## Project Structure

- `backend/` - FastAPI API, database models, services, scripts, and tests.
- `frontend/` - React 18 client built with Vite, Bootstrap, Axios, and React Router.
- `docs/` - System documentation, API notes, screenshots, and UML artifacts.

## Quick Start

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API starts at `http://localhost:8000`.

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

The frontend starts at `http://localhost:5173`.

