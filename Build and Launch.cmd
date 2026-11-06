@echo off
setlocal
cd /d "%~dp0"
if errorlevel 1 goto :fail

where node >nul 2>&1
if errorlevel 1 goto :missing_node
where npm >nul 2>&1
if errorlevel 1 goto :missing_node

if not exist "node_modules\electron\dist\electron.exe" (
  echo Installing DJX-Exhibition dependencies...
  call npm ci
  if errorlevel 1 goto :fail
)

echo.
echo Building DJX-Exhibition...
call npm run build
if errorlevel 1 goto :fail

echo.
echo Launching DJX-Exhibition...
call npm start
if errorlevel 1 goto :fail
exit /b 0

:missing_node
echo Node.js and npm are required. Install Node.js 22.12 or newer.
goto :fail

:fail
echo.
echo Build or launch failed. Review the errors above.
pause
exit /b 1
