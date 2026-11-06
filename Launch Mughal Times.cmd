@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22 or newer is required. Install it and rerun this launcher.
  pause
  exit /b 1
)
if not exist "node_modules\electron\dist\electron.exe" (
  echo Installing exhibition dependencies...
  call npm ci
  if errorlevel 1 (
    echo Installation failed.
    pause
    exit /b 1
  )
)
node scripts\ensure-built.mjs
set "buildstatus=%errorlevel%"
if "%buildstatus%"=="2" (
  echo Building updated exhibition...
  call npm run build
  if errorlevel 1 (
    echo Build failed.
    pause
    exit /b 1
  )
) else if not "%buildstatus%"=="0" (
  echo Could not verify the current build.
  pause
  exit /b 1
)
call npm start
if errorlevel 1 pause
endlocal
