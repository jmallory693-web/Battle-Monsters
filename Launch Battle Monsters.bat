@echo off
REM =============================================================================
REM  Launch Battle Monsters.bat
REM  Double-click this file to start the dev server and open the game in your browser.
REM =============================================================================

REM Keep the window open if a command fails, so errors are visible.
setlocal EnableExtensions

REM Change to the folder where this batch file lives (the project root).
REM %~dp0 is the drive and path of this script — required when launched from Explorer.
cd /d "%~dp0"

echo.
echo ========================================
echo   Battle Monsters - Starting...
echo ========================================
echo.
echo Project folder: %CD%
echo.

REM Check that Node.js/npm is available before continuing.
where npm >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm was not found. Install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Check that dependencies are installed.
if not exist "node_modules\" (
    echo ERROR: node_modules not found. Run "npm install" in this folder first.
    echo.
    pause
    exit /b 1
)

REM Open the browser after a short delay, in a background process.
REM This runs in parallel so "npm run dev" output stays visible in this window.
REM ping -n 6 waits about 5 seconds (1 second per ping, minus the first).
echo A browser window will open to http://localhost:5173 in a few seconds...
start /b "" cmd /c "ping -n 6 127.0.0.1 >nul && start "" http://localhost:5173"

REM Start the Vite development server in this window (output remains visible).
echo Starting Vite dev server...
echo Press Ctrl+C to stop the server when you are done playing.
echo.
npm run dev

REM If the server exits, pause so the window does not close immediately on error.
echo.
echo Server stopped.
pause

endlocal
