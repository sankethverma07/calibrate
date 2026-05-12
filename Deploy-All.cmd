@echo off
REM ════════════════════════════════════════════════════════════════════
REM Calibrate · Full deployment script
REM ════════════════════════════════════════════════════════════════════
REM Logs every step to deploy.log so an external observer can see what
REM happened. Runs in order: git init, GitHub publish, Vercel deploy,
REM installer build.
REM ════════════════════════════════════════════════════════════════════

cd /d "%~dp0"
del /q deploy.log 2>nul

echo === Calibrate · Deploy-All run === > deploy.log
echo Time: %DATE% %TIME% >> deploy.log
echo. >> deploy.log

REM ─── 0. Environment check ────────────────────────────────────────
echo === STEP 0: environment check === >> deploy.log

where git    >> deploy.log 2>&1 && echo git: OK    >> deploy.log || echo git: MISSING    >> deploy.log
where gh     >> deploy.log 2>&1 && echo gh: OK     >> deploy.log || echo gh: MISSING     >> deploy.log
where node   >> deploy.log 2>&1 && echo node: OK   >> deploy.log || echo node: MISSING   >> deploy.log
where npm    >> deploy.log 2>&1 && echo npm: OK    >> deploy.log || echo npm: MISSING    >> deploy.log
where vercel >> deploy.log 2>&1 && echo vercel: OK >> deploy.log || echo vercel: MISSING >> deploy.log

echo. >> deploy.log
echo --- gh auth status --- >> deploy.log
gh auth status >> deploy.log 2>&1

echo. >> deploy.log
echo --- vercel whoami --- >> deploy.log
vercel whoami >> deploy.log 2>&1

echo. >> deploy.log
echo --- git config user --- >> deploy.log
git config --global user.name  >> deploy.log 2>&1
git config --global user.email >> deploy.log 2>&1

echo. >> deploy.log
echo === STEP 0 complete === >> deploy.log
echo. >> deploy.log

REM ─── 1. Initialize git repo ──────────────────────────────────────
echo === STEP 1: initialize git === >> deploy.log

if exist ".git" rmdir /s /q .git >> deploy.log 2>&1

git init -b main >> deploy.log 2>&1
git config user.name  "Sanketh Verma" >> deploy.log 2>&1
git config user.email "sankethverma07@gmail.com" >> deploy.log 2>&1
git add . >> deploy.log 2>&1
git commit -m "Calibrate v1.0.0 — initial public release" -m "Closed-loop biofeedback EQ. Reads typing rhythm + mouse precision, infers focus state, retunes system EQ via Equalizer APO." >> deploy.log 2>&1
echo --- git log --- >> deploy.log
git log --oneline -1 >> deploy.log 2>&1

echo. >> deploy.log
echo === STEP 1 complete === >> deploy.log
echo. >> deploy.log

REM ─── 2. Publish to GitHub ────────────────────────────────────────
echo === STEP 2: publish to GitHub === >> deploy.log

where gh >nul 2>&1
if errorlevel 1 (
  echo gh CLI not installed — skipping. Install from https://cli.github.com >> deploy.log
  echo. >> deploy.log
  goto STEP3
)

gh auth status >nul 2>&1
if errorlevel 1 (
  echo gh CLI not authenticated. Run: gh auth login >> deploy.log
  echo. >> deploy.log
  goto STEP3
)

gh repo view sankethverma07/calibrate >nul 2>&1
if not errorlevel 1 (
  echo Repo already exists. Pushing... >> deploy.log
  git remote remove origin 2>nul
  git remote add origin https://github.com/sankethverma07/calibrate.git >> deploy.log 2>&1
  git push -u origin main --force >> deploy.log 2>&1
) else (
  echo Creating public repo... >> deploy.log
  gh repo create calibrate --public --source . --push --description "Closed-loop biofeedback EQ for your computer's audio. Reads your typing rhythm + mouse precision, infers focus state, retunes system EQ." >> deploy.log 2>&1
)

echo. >> deploy.log
echo === STEP 2 complete === >> deploy.log
echo. >> deploy.log

:STEP3
REM ─── 3. Deploy marketing site to Vercel ──────────────────────────
echo === STEP 3: deploy to Vercel === >> deploy.log

where vercel >nul 2>&1
if errorlevel 1 (
  echo Vercel CLI not installed. Installing... >> deploy.log
  call npm install -g vercel >> deploy.log 2>&1
)

vercel whoami >nul 2>&1
if errorlevel 1 (
  echo Vercel CLI not authenticated. Run: vercel login >> deploy.log
  echo. >> deploy.log
  goto STEP4
)

echo Deploying to Vercel (production)... >> deploy.log
call vercel deploy --prod --yes --name calibrate >> deploy.log 2>&1

echo. >> deploy.log
echo === STEP 3 complete === >> deploy.log
echo. >> deploy.log

:STEP4
REM ─── 4. Build Windows installer ──────────────────────────────────
echo === STEP 4: build Windows installer === >> deploy.log

if not exist "electron\node_modules" (
  echo Installing electron deps... >> deploy.log
  pushd electron
  call npm install >> ..\deploy.log 2>&1
  popd
)

pushd electron
call npm run package:win >> ..\deploy.log 2>&1
popd

if exist "electron\dist" (
  echo --- electron\dist contents --- >> deploy.log
  dir /b electron\dist >> deploy.log 2>&1
)

echo. >> deploy.log
echo === STEP 4 complete === >> deploy.log
echo. >> deploy.log

REM ─── 5. Create GitHub release ────────────────────────────────────
echo === STEP 5: create GitHub release === >> deploy.log

where gh >nul 2>&1
if errorlevel 1 goto DONE

set "INSTALLER="
for %%F in (electron\dist\*.exe) do set "INSTALLER=%%F"

if not defined INSTALLER (
  echo No installer .exe found in electron\dist — skipping release. >> deploy.log
  goto DONE
)

echo Found installer: %INSTALLER% >> deploy.log
gh release create v1.0.0 "%INSTALLER%" --title "Calibrate v1.0.0" --notes "Initial public release. Closed-loop biofeedback EQ for Windows. Requires Equalizer APO." >> deploy.log 2>&1

:DONE
echo. >> deploy.log
echo === DEPLOY-ALL COMPLETE === >> deploy.log
echo Time: %DATE% %TIME% >> deploy.log
type deploy.log
exit /b 0
