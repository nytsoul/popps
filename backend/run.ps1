# Script to start ShopScale backend dev server
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

$env:PYTHONPATH = $ScriptDir

# Use local virtual environment python
$PythonExe = Join-Path $ScriptDir ".venv\Scripts\python.exe"
if (-not (Test-Path $PythonExe)) {
    $PythonExe = "$env:LOCALAPPDATA\Microsoft\WindowsApps\python.exe"
}

Write-Host "Starting ShopScale FastAPI backend server..." -ForegroundColor Green
Write-Host "Using Python: $PythonExe" -ForegroundColor Cyan
Write-Host "Docs: http://127.0.0.1:8000/docs" -ForegroundColor Yellow

& $PythonExe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
