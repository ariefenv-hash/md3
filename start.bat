@echo off
rem ==================== start.bat - One-click local server (Windows) ====================
rem Double-click to run. Serves the repo root over HTTP, then open:
rem   http://localhost:8080/
rem Requires Python or Node.js (either one). Stop with Ctrl + C.

chcp 65001 >nul 2>&1
cd /d "%~dp0"

echo.
echo ========================================================
echo   Android 16 Geek - starting local server...
echo   URL  : http://localhost:8080/
echo   Skip lock screen: http://localhost:8080/?nolock=1
echo   Stop : press Ctrl + C
echo ========================================================
echo.

where py >nul 2>nul
if %errorlevel%==0 (
  py -3 -m http.server 8080
  goto :end
)

where python >nul 2>nul
if %errorlevel%==0 (
  python -m http.server 8080
  goto :end
)

where node >nul 2>nul
if %errorlevel%==0 (
  node scripts\serve.mjs --port 8080
  goto :end
)

echo [ERROR] Neither Python nor Node.js was found.
echo Please install one of them, then run this file again:
echo   Python : https://www.python.org/downloads/
echo   Node.js: https://nodejs.org/

:end
echo.
pause
