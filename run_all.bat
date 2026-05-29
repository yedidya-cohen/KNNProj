@echo off
setlocal EnableExtensions

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "FRONTEND_DIR=%ROOT_DIR%frontend"

if "%BACKEND_PORT%"=="" set "BACKEND_PORT=8000"
if "%FRONTEND_PORT%"=="" set "FRONTEND_PORT=5173"

if /I "%~1"=="--help" goto :help
if /I "%~1"=="-h" goto :help

where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set "PYTHON_CMD=python"
    goto :python_found
)

where py >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set "PYTHON_CMD=py -3"
    goto :python_found
)

echo Python was not found. Install Python 3.11+ and try again.
exit /b 1

:python_found
where npm.cmd >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo npm was not found. Install Node.js and try again.
    exit /b 1
)

if not exist "%BACKEND_DIR%\.venv\Scripts\python.exe" (
    echo Creating backend virtual environment...
    pushd "%BACKEND_DIR%"
    %PYTHON_CMD% -m venv .venv
    if %ERRORLEVEL% NEQ 0 exit /b %ERRORLEVEL%
    popd
)

echo Installing backend dependencies...
pushd "%BACKEND_DIR%"
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if %ERRORLEVEL% NEQ 0 exit /b %ERRORLEVEL%
popd

if not exist "%FRONTEND_DIR%\node_modules" (
    echo Installing frontend dependencies...
    pushd "%FRONTEND_DIR%"
    npm.cmd install
    if %ERRORLEVEL% NEQ 0 exit /b %ERRORLEVEL%
    popd
)

if /I "%~1"=="--seed" (
    echo Seeding database...
    pushd "%BACKEND_DIR%"
    echo yes| ".venv\Scripts\python.exe" -m app.scripts.seed_data
    if %ERRORLEVEL% NEQ 0 exit /b %ERRORLEVEL%
    popd
)

echo Starting backend on http://localhost:%BACKEND_PORT%
start "Grade Prediction Backend" /d "%BACKEND_DIR%" cmd /k ".venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port %BACKEND_PORT%"

echo Starting frontend on http://localhost:%FRONTEND_PORT%
start "Grade Prediction Frontend" /d "%FRONTEND_DIR%" cmd /k "npm.cmd run dev -- --host 0.0.0.0 --port %FRONTEND_PORT%"

echo.
echo Project is starting.
echo.
echo Backend:  http://localhost:%BACKEND_PORT%
echo API docs: http://localhost:%BACKEND_PORT%/docs
echo Frontend: http://localhost:%FRONTEND_PORT%
echo.
echo Close the two opened Command Prompt windows to stop the servers.
exit /b 0

:help
echo Usage: run_all.bat [--seed]
echo.
echo Starts:
echo   Backend:  http://localhost:%BACKEND_PORT%
echo   Frontend: http://localhost:%FRONTEND_PORT%
echo.
echo Options:
echo   --seed    Run backend seed script before starting the servers.
echo.
echo Environment overrides:
echo   set BACKEND_PORT=8001
echo   set FRONTEND_PORT=5174
echo   run_all.bat
exit /b 0
