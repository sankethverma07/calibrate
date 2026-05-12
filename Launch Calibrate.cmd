@echo off
REM Calibrate launcher — runs the Electron app from the right working dir.
cd /d "%~dp0electron"
echo Starting Calibrate...
call npm start
