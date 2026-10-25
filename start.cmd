@echo off
setlocal
cd /d "%~dp0"
start "STELLARE site server" /min powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1" -Port 8767
timeout /t 1 /nobreak >nul
start "" "http://127.0.0.1:8767/"
endlocal
