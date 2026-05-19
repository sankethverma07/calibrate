@echo off
REM ════════════════════════════════════════════════════════════════════
REM  Calibrate Sandbox — one-click dev server.
REM
REM  First run: installs node_modules (~2 min, ~250MB on disk).
REM  After that: just starts Vite. Browser opens automatically.
REM
REM  Hot module reload is on. Edit any file in
REM  portfolio-assets\sandbox\src and the change appears instantly.
REM ════════════════════════════════════════════════════════════════════
setlocal
set "SANDBOX=%~dp0portfolio-assets\sandbox"
cd /d "%SANDBOX%"

if not exist "node_modules" (
  echo.
  echo === Installing dependencies (first run, may take ~2 min) ===
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo npm install failed. Make sure Node.js is installed.
    pause
    exit /b 1
  )
)

echo.
echo === Starting Vite dev server on http://localhost:5180 ===
echo === Press Ctrl+C to stop ===
echo.
call npm run dev
