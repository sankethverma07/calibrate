@echo off
cd /d "%~dp0"
echo === Pushing site/index.html === > push.log
git add site/index.html >> push.log 2>&1
git commit -m "site: add index.html → redirects to welcome.html" >> push.log 2>&1
git push origin main >> push.log 2>&1
echo === DONE === >> push.log
type push.log
exit /b 0
