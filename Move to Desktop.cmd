@echo off
REM Move the entire mood-eq folder from its current location to the Desktop.
REM Uses xcopy+rmdir so it's atomic-safe even though we're running from inside
REM the folder being moved (the .cmd file is loaded into memory before xcopy
REM starts).
setlocal enabledelayedexpansion

set "SRC=%~dp0"
if "!SRC:~-1!"=="\" set "SRC=!SRC:~0,-1!"
set "DEST=%USERPROFILE%\Desktop\mood-eq"

echo.
echo === Calibrate folder mover ===
echo.
echo Source:      !SRC!
echo Destination: !DEST!
echo.

if exist "!DEST!" (
  echo [!] Destination already exists on Desktop. Aborting to avoid overwrite.
  pause
  exit /b 1
)

echo Copying files...
xcopy /E /I /H /Y /Q "!SRC!" "!DEST!" >nul
if errorlevel 1 (
  echo [x] xcopy failed. Source is untouched.
  pause
  exit /b 1
)

if not exist "!DEST!\package.json" (
  echo [x] Copy verification failed. Source is untouched.
  pause
  exit /b 1
)

echo Copy verified. Removing source from Downloads...
cd /d "%USERPROFILE%"
rmdir /S /Q "!SRC!"

echo.
echo [v] Done. Calibrate is now on your Desktop: !DEST!
echo     Launch with: !DEST!\Launch Calibrate.cmd
echo.
pause
