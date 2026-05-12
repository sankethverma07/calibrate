@echo off
title Calibrate Dev Server
cd /d "%~dp0"
echo.
echo  Starting Calibrate dev server...
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
  echo  ERROR: Node.js not found. Please install it from https://nodejs.org
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo  Installing dependencies (first run only)...
  call npm install
  echo.
)

echo  Server starting at http://localhost:5000
echo  Press Ctrl+C to stop.
echo.
start "" "http://localhost:5000"
call npm run dev
pause
