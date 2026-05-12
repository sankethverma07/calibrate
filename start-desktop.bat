@echo off
title Calibrate Desktop Launcher
cd /d "%~dp0"
setlocal

echo.
echo  Calibrate Desktop -- booting...
echo.

REM ── Verify Node ─────────────────────────────────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
  echo  ERROR: Node.js not found. Install from https://nodejs.org
  pause
  exit /b 1
)

REM ── Verify root deps ────────────────────────────────────────────────────
if not exist "node_modules" (
  echo  Installing root dependencies (one-time)...
  call npm install
)

REM ── Verify electron deps ────────────────────────────────────────────────
if not exist "electron\node_modules" (
  echo.
  echo  Installing Electron runtime (one-time, ~150MB) -- this takes a few minutes...
  pushd electron
  call npm install
  popd
)

REM ── Is the dev server already up? ───────────────────────────────────────
call :checkport
if %errorlevel% equ 0 goto serverup

echo.
echo  Starting dev server in a background window...
start "Calibrate Dev Server" cmd /c "npm run dev"

echo  Waiting for http://localhost:5000 ...
:waitloop
timeout /t 1 /nobreak >nul
call :checkport
if errorlevel 1 goto waitloop

:serverup
echo  Dev server is up.

REM ── Launch Electron pointing at the dev server ──────────────────────────
echo.
echo  Launching Calibrate desktop window...
set NODE_ENV=development
cd electron
call npm start

echo.
echo  Calibrate window closed. The dev server window is still running.
pause
exit /b 0

:checkport
powershell -NoProfile -Command "try { $c=New-Object Net.Sockets.TcpClient; $c.Connect('localhost',5000); $c.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
exit /b %errorlevel%
