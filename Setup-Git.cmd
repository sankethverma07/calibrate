@echo off
REM ════════════════════════════════════════════════════════════════════
REM Calibrate · Git + GitHub setup
REM ════════════════════════════════════════════════════════════════════
REM One-time setup: reinitializes a clean git repo, configures author,
REM stages everything (respecting .gitignore), and makes the first
REM commit. Then optionally creates the GitHub repo + pushes via gh CLI.
REM
REM Run from the repo root by double-clicking, or from a shell:
REM   Setup-Git.cmd
REM ════════════════════════════════════════════════════════════════════

cd /d "%~dp0"

echo.
echo === Calibrate · Git + GitHub setup ===
echo.

REM ─── Re-init clean git ───────────────────────────────────────────
if exist ".git" (
  echo Removing existing .git directory...
  rmdir /s /q .git
)

git init -b main
if errorlevel 1 (
  echo ERROR: git init failed. Is git installed? https://git-scm.com/download/win
  pause
  exit /b 1
)

git config user.name  "Sanketh Verma"
git config user.email "sankethverma07@gmail.com"

REM ─── Stage everything, respecting .gitignore ────────────────────
git add .
git status --short

REM ─── First commit ────────────────────────────────────────────────
git commit -m "Calibrate v1.0.0 — initial public release" -m "Closed-loop biofeedback EQ. Reads typing rhythm + mouse precision, infers focus state, retunes system EQ via Equalizer APO. Per-mood EQ presets, breathing pulse, gamified profile, per-song mood memory, custom 8-band EQ + named presets, mood-tinted UI, Type/Hover playground."

if errorlevel 1 (
  echo ERROR: commit failed. Inspect git status above.
  pause
  exit /b 1
)

echo.
echo === First commit created ===
git log --oneline -1
echo.

REM ─── Optional: publish via gh CLI ────────────────────────────────
where gh >nul 2>&1
if errorlevel 1 (
  echo Step next: install the GitHub CLI ^(https://cli.github.com^) and run:
  echo     gh auth login
  echo     gh repo create calibrate --public --source . --push
  echo.
  echo Or push to an existing repo:
  echo     git remote add origin https://github.com/sankethverma07/calibrate.git
  echo     git push -u origin main
  echo.
  pause
  exit /b 0
)

echo gh CLI detected.
echo Ready to publish to GitHub?
choice /C YN /M "Create public repo 'calibrate' and push now?"
if errorlevel 2 (
  echo Skipping publish. To do it later:
  echo     gh repo create calibrate --public --source . --push
  pause
  exit /b 0
)

gh repo create calibrate --public --source . --push --description "Closed-loop biofeedback EQ for your computer's audio. Reads your typing rhythm + mouse precision, infers focus state, retunes system EQ."

if errorlevel 1 (
  echo ERROR: gh repo create failed. Try manually:
  echo     gh repo create calibrate --public --source . --push
  pause
  exit /b 1
)

echo.
echo === Calibrate is live on GitHub ===
echo Repo URL:
gh repo view --json url --jq ".url"
echo.
pause
