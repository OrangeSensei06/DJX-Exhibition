@echo off
setlocal EnableExtensions
cd /d "%~dp0"
if errorlevel 1 goto :failed

where node >nul 2>&1
if errorlevel 1 goto :missing_node
where npm >nul 2>&1
if errorlevel 1 goto :missing_node

echo ================================================
echo  DJX-Exhibition - Windows portable app builder
echo ================================================
echo.
echo This runs on the developer's laptop only.
echo Your friend's laptop will NOT need Node.js or npm.
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\make-portable.ps1"
if errorlevel 1 goto :failed

echo.
echo Done. Share the ZIP in the portable-output folder.
pause
exit /b 0

:missing_node
echo Node.js / npm are required on the BUILD laptop only.
echo Build once on a laptop with Node.js 22+ and share the resulting ZIP.
goto :failed

:failed
echo.
echo Packaging failed. Read the error above; no incomplete ZIP is ready.
pause
exit /b 1
