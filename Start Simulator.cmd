@echo off
setlocal
cd /d "%~dp0"
title 8085 Lab Desk - Local Simulator
where node >nul 2>nul
if not errorlevel 1 (
    node tools\server.mjs --open
    goto finished
)
where python >nul 2>nul
if not errorlevel 1 (
    python tools\server.py --open
    goto finished
)
where py >nul 2>nul
if not errorlevel 1 (
    py -3 tools\server.py --open
    goto finished
)
echo Node.js 18+ or Python 3 is required to run the local server.
echo Install either runtime, then double-click this file again.
:finished
if errorlevel 1 pause
endlocal
