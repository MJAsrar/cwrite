@echo off
echo Starting CoWriteAI Development Environment...
echo.

REM Start backend in a new window
echo Starting Backend Server...
start "CoWriteAI Backend" cmd /k "cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend in a new window
echo Starting Frontend Server...
start "CoWriteAI Frontend" cmd /k "npm run dev"

echo.
echo ✅ Development servers are starting!
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo.
echo Press any key to exit...
pause >nul