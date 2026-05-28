@echo off
title Workspace Hub Launcher
cd /d "%~dp0"
echo ===================================================
echo   Workspace Hub - One-Click Launcher
echo ===================================================
echo.
echo Starting Flask web server on http://localhost:19191...
echo.
.venv\Scripts\python.exe run.py
if %ERRORLEVEL% neq 0 (
    echo.
    echo Server stopped with an error (Error Code: %ERRORLEVEL%).
    pause
)
