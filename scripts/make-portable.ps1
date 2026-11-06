# Produces a self-contained Windows Electron folder and ZIP.
# Run using the root-level MAKE PORTABLE APP.cmd on the development laptop.
# The receiving laptop does not need Node.js, npm, internet or a build tool.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root

function Require-File([string] $path, [string] $description) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw "Missing $description at: $path"
    }
}
function Run-Npm([string[]] $arguments) {
    Write-Host ('> npm ' + ($arguments -join ' ')) -ForegroundColor Cyan
    & npm.cmd @arguments
    if ($LASTEXITCODE -ne 0) {
        throw "npm command failed with exit code $LASTEXITCODE."
    }
}

$electron = Join-Path $root 'node_modules\electron\dist'
if (-not (Test-Path -LiteralPath (Join-Path $electron 'electron.exe'))) {
    Write-Host 'Installing build dependencies on THIS computer only...' -ForegroundColor Cyan
    Run-Npm @('ci')
}

Write-Host 'Running tests and compiling the exhibition...' -ForegroundColor Cyan
Run-Npm @('run', 'check')

Require-File (Join-Path $root 'dist\index.html') 'built exhibition page'
Require-File (Join-Path $root 'dist-electron\electron\main.js') 'built Electron main process'
Require-File (Join-Path $root 'dist\vision\gesture-lab\models\hand_landmarker.task') 'offline hand-tracking model'
Require-File (Join-Path $root 'dist\audio\palace-evening.ogg') 'offline ambient music'
Require-File (Join-Path $electron 'electron.exe') 'bundled Windows Electron runtime'

$destinationRoot = Join-Path $root 'portable-output'
$appDir = Join-Path $destinationRoot 'DJX-Exhibition-Portable'
$zipFile = Join-Path $destinationRoot 'DJX-Exhibition-Portable-Windows.zip'
if (Test-Path -LiteralPath $appDir) { Remove-Item -LiteralPath $appDir -Recurse -Force }
New-Item -ItemType Directory -Path $appDir -Force | Out-Null

Write-Host 'Copying the complete Electron Windows runtime...' -ForegroundColor Cyan
Get-ChildItem -LiteralPath $electron -Force | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $appDir -Recurse -Force
}

$appResources = Join-Path $appDir 'resources\app'
New-Item -ItemType Directory -Path $appResources -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $root 'dist') -Destination $appResources -Recurse -Force
Copy-Item -LiteralPath (Join-Path $root 'dist-electron') -Destination $appResources -Recurse -Force
Copy-Item -LiteralPath (Join-Path $root 'package.json') -Destination $appResources -Force

# Windows Electron automatically loads resources/app/package.json. All production
# React dependencies are bundled by Vite; Node/npm and node_modules are not needed.
Rename-Item -LiteralPath (Join-Path $appDir 'electron.exe') -NewName 'DJX-Exhibition.exe'
Require-File (Join-Path $appResources 'dist\index.html') 'packaged exhibition page'
Require-File (Join-Path $appResources 'dist-electron\electron\main.js') 'packaged Electron entry'

$launch = @'
@echo off
cd /d "%~dp0"
start "" "%~dp0DJX-Exhibition.exe"
'@
[System.IO.File]::WriteAllText((Join-Path $appDir 'START DJX EXHIBITION.cmd'), $launch, [System.Text.Encoding]::ASCII)

$readme = @'
DJX EXHIBITION - PORTABLE WINDOWS APP
====================================
Requirements: Windows 10 or 11 (64-bit), webcam and adequate GPU performance.
Node.js, npm, Python, a development environment and an internet connection
are NOT required on the computer that receives this ZIP.

1. Extract the ENTIRE ZIP to a normal folder (for example Desktop).
2. Double-click "DJX-Exhibition.exe" or "START DJX EXHIBITION.cmd".
3. Allow camera access when prompted and enable the camera in Setup.
4. Assign displays in Setup if using an exhibition with two monitors.

Do not launch from inside a ZIP without extracting it first.
The hand-tracking model, chapter artwork, music, effects and Electron
runtime are included. The application is unsigned.
'@
[System.IO.File]::WriteAllText((Join-Path $appDir 'README - START HERE.txt'), $readme, [System.Text.Encoding]::UTF8)

if (Test-Path -LiteralPath $zipFile) { Remove-Item -LiteralPath $zipFile -Force }
Write-Host 'Compressing the portable distribution; this may take some time...' -ForegroundColor Cyan
Compress-Archive -LiteralPath $appDir -DestinationPath $zipFile -CompressionLevel Optimal
Require-File $zipFile 'portable app ZIP'

Write-Host ''
Write-Host 'PORTABLE PACKAGE READY:' -ForegroundColor Green
Write-Host $zipFile -ForegroundColor Green
Write-Host 'Copy the ZIP to your friend. They only need to extract and double-click the .exe.'
