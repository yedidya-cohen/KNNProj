#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  cat <<EOF
Usage: ./run_all.sh [--seed]

Starts:
  Backend:  http://localhost:${BACKEND_PORT}
  Frontend: http://localhost:${FRONTEND_PORT}

Options:
  --seed    Run backend seed script before starting the servers.

Environment overrides:
  BACKEND_PORT=8000 FRONTEND_PORT=5173 ./run_all.sh
EOF
  exit 0
fi

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

find_python() {
  if command_exists python; then
    echo "python"
  elif command_exists python3; then
    echo "python3"
  elif command_exists py; then
    echo "py -3"
  else
    echo ""
  fi
}

cleanup() {
  if [[ -n "${BACKEND_PID:-}" ]]; then
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
  fi

  if [[ -n "${FRONTEND_PID:-}" ]]; then
    kill "$FRONTEND_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

PYTHON_CMD="$(find_python)"
if [[ -z "$PYTHON_CMD" ]]; then
  echo "Python was not found. Install Python 3.11+ and try again."
  exit 1
fi

if ! command_exists npm; then
  echo "npm was not found. Install Node.js and try again."
  exit 1
fi

if [[ ! -f "$BACKEND_DIR/.venv/Scripts/python.exe" && ! -f "$BACKEND_DIR/.venv/bin/python" ]]; then
  echo "Creating backend virtual environment..."
  (cd "$BACKEND_DIR" && $PYTHON_CMD -m venv .venv)
fi

if [[ -f "$BACKEND_DIR/.venv/Scripts/python.exe" ]]; then
  BACKEND_PYTHON="$BACKEND_DIR/.venv/Scripts/python.exe"
else
  BACKEND_PYTHON="$BACKEND_DIR/.venv/bin/python"
fi

echo "Installing backend dependencies..."
(cd "$BACKEND_DIR" && "$BACKEND_PYTHON" -m pip install -r requirements.txt)

if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
  echo "Installing frontend dependencies..."
  (cd "$FRONTEND_DIR" && npm install)
fi

if [[ "${1:-}" == "--seed" ]]; then
  echo "Seeding database..."
  (cd "$BACKEND_DIR" && printf "yes\n" | "$BACKEND_PYTHON" -m app.scripts.seed_data)
fi

echo "Starting backend on http://localhost:${BACKEND_PORT}"
(cd "$BACKEND_DIR" && "$BACKEND_PYTHON" -m uvicorn app.main:app --reload --host 0.0.0.0 --port "$BACKEND_PORT") &
BACKEND_PID=$!

echo "Starting frontend on http://localhost:${FRONTEND_PORT}"
(cd "$FRONTEND_DIR" && npm run dev -- --host 0.0.0.0 --port "$FRONTEND_PORT") &
FRONTEND_PID=$!

cat <<EOF

Project is starting.

Backend:  http://localhost:${BACKEND_PORT}
API docs: http://localhost:${BACKEND_PORT}/docs
Frontend: http://localhost:${FRONTEND_PORT}

Press Ctrl+C to stop both servers.
EOF

wait "$BACKEND_PID" "$FRONTEND_PID"
