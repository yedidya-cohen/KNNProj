# Backend

FastAPI backend for the Course Grade Prediction System.

## Setup

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Health Check

Open `http://localhost:8000` and expect:

```json
{
  "status": "ok"
}
```

