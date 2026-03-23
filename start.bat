@echo off
REM Start Both Frontend and Backend

echo Starting Health-Data-Hub...
echo.

REM Start Backend in a new terminal
echo Starting Backend...
start cmd /k "cd backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

REM Wait a moment for backend to initialize
timeout /t 2 /nobreak

REM Start Frontend in a new terminal
echo Starting Frontend...
start cmd /k "cd frontend && npm install && npm run dev"

echo.
echo Frontend: http://localhost:5000
echo Backend: http://localhost:8000
echo.
pause
