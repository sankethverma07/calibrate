@echo off
REM ════════════════════════════════════════════════════════════════════
REM Calibrate · Ship a new release
REM ════════════════════════════════════════════════════════════════════
REM One-shot: stage all current edits, commit them, tag the commit, and
REM push both the branch and the tag. The push of the v* tag triggers
REM the GitHub Actions release job (.github/workflows/ci.yml) which
REM builds the Windows / macOS / Linux installers and publishes them
REM to a fresh GitHub Release.
REM
REM Usage:
REM   Ship-Release.cmd            ← reads version from package.json
REM   Ship-Release.cmd v1.0.2     ← override the tag explicitly
REM
REM Prereqs:
REM   - git is installed and on PATH
REM   - your local clone is authenticated to push to origin
REM   - you bumped the version in package.json + electron/package.json
REM     (the bump is your "I mean to release this" signal)
REM ════════════════════════════════════════════════════════════════════

setlocal enabledelayedexpansion
cd /d "%~dp0"

REM ── Resolve the tag to use ────────────────────────────────────────
set "TAG=%~1"
if "%TAG%"=="" (
  for /f "tokens=2 delims=:," %%a in ('findstr /c:"\"version\":" package.json') do (
    set "VER=%%a"
    goto :gotver
  )
  :gotver
  set "VER=!VER: =!"
  set "VER=!VER:"=!"
  set "TAG=v!VER!"
)

echo.
echo === Calibrate · shipping %TAG% ===
echo.

REM ── Verify clean-ish state and a remote ──────────────────────────
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo ERROR: not a git repo. Run `git init` and add an `origin` remote first.
  pause & exit /b 1
)

git remote get-url origin >nul 2>&1
if errorlevel 1 (
  echo ERROR: no `origin` remote configured. Run:
  echo   git remote add origin https://github.com/sankethverma07/calibrate.git
  pause & exit /b 1
)

REM ── Clear any stale lock so git add doesn't refuse to run ────────
REM (Earlier sandboxed runs from a Linux mount can leave .git/index.lock
REM behind when they can't acquire the lock properly. We delete it
REM proactively here so a re-run always starts from a clean state.)
if exist ".git\index.lock" (
  echo --- clearing stale .git\index.lock ---
  del /f /q ".git\index.lock"
)

REM ── Stage + commit ────────────────────────────────────────────────
echo --- staging changes ---
git add -A
if errorlevel 1 (
  echo ERROR: `git add -A` failed. Aborting.
  pause & exit /b 1
)
echo.
echo --- commit ---
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "chore: ship %TAG%"
  if errorlevel 1 (
    echo ERROR: `git commit` failed. Aborting.
    pause & exit /b 1
  )
) else (
  echo No staged changes — assuming a previous commit was already made.
)

REM ── Tag (delete + re-create so re-runs are idempotent for the same version) ──
echo.
echo --- tagging %TAG% ---
git tag -d %TAG% >nul 2>&1
git push origin :refs/tags/%TAG% >nul 2>&1
git tag -a %TAG% -m "Release %TAG%"

REM ── Push branch + tag ────────────────────────────────────────────
echo.
echo --- pushing main ---
git push origin main
if errorlevel 1 (
  echo ERROR: `git push origin main` failed. Resolve credentials and retry.
  pause & exit /b 1
)

echo.
echo --- pushing %TAG% (this triggers the release workflow) ---
git push origin %TAG%
if errorlevel 1 (
  echo ERROR: tag push failed.
  pause & exit /b 1
)

echo.
echo === Pushed %TAG% ===
echo.
echo Watch the release build at:
echo   https://github.com/sankethverma07/calibrate/actions
echo.
echo When the run is green, the installers appear at:
echo   https://github.com/sankethverma07/calibrate/releases/tag/%TAG%
echo.
echo The Vercel marketing page will auto-pick up the new release via
echo the GitHub API call in site/welcome.html — no manual edit needed.
echo.
pause
exit /b 0
