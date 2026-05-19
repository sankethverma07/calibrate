@echo off
cd /d "%~dp0"
echo === Pushing to GitHub === > push.log
git remote remove origin >> push.log 2>&1
git remote add origin https://github.com/sankethverma07/calibrate.git >> push.log 2>&1
echo --- remote -v --- >> push.log
git remote -v >> push.log 2>&1
echo --- pushing main --- >> push.log
git push -u origin main >> push.log 2>&1
echo === DONE === >> push.log
type push.log
exit /b 0
