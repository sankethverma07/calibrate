@echo off
REM ════════════════════════════════════════════════════════════════════
REM Calibrate · Windows installer build
REM ════════════════════════════════════════════════════════════════════
REM Produces an NSIS installer (.exe) in electron\dist\.
REM Upload it to GitHub Releases when shipping a new version.
REM
REM Run from the repo root:
REM   Build-Installer.cmd
REM ════════════════════════════════════════════════════════════════════

cd /d "%~dp0"

echo.
echo === Calibrate · Building Windows installer ===
echo.

REM ─── Verify deps ────────────────────────────────────────────────
if not exist "electron\node_modules" (
  echo Installing electron deps...
  pushd electron
  call npm install
  popd
  if errorlevel 1 (
    echo ERROR: electron npm install failed.
    pause
    exit /b 1
  )
)

REM ─── Build ──────────────────────────────────────────────────────
pushd electron
call npm run package:win
popd

if errorlevel 1 (
  echo.
  echo ERROR: build failed. Check the output above.
  pause
  exit /b 1
)

echo.
echo === Installer built ===
echo Look in: electron\dist\
echo Upload the .exe to GitHub Releases at:
echo   https://github.com/sankethverma07/calibrate/releases/new
echo.
pause
