@echo off
setlocal
cd /d "%~dp0"
node --test tests\*.test.js
pause
endlocal
