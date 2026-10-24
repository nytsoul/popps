@echo off
cd /d "%~dp0"
set PYTHONPATH=%~dp0

if exist ".venv\Scripts\python.exe" (
    set "PYTHON_EXE=.venv\Scripts\python.exe"
) else (
    set "PYTHON_EXE=%LOCALAPPDATA%\Microsoft\WindowsApps\python.exe"
)

echo Starting ShopScale FastAPI backend server...
echo Using Python: %PYTHON_EXE%
echo Docs: http://127.0.0.1:8000/docs

"%PYTHON_EXE%" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause
