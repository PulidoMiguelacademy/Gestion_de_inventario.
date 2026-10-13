@echo off
title TecnoStock Web - Iniciador del Proyecto
echo ========================================================
echo        INICIANDO TECNOSTOCK WEB (REACT + PYTHON)
echo ========================================================
echo.

:: 1. Iniciar Backend en Python (FastAPI en puerto 8000)
echo [1/3] Iniciando Servidor Python en http://localhost:8000 ...
start "TecnoStock - Backend Python" cmd /k "cd /d "%~dp0backend" && python -m uvicorn main:app --reload --port 8000"

:: 2. Iniciar Frontend en React (Vite en puerto 5173)
echo [2/3] Iniciando Frontend React en http://localhost:5173 ...
start "TecnoStock - Frontend React" cmd /k "cd /d "%~dp0frontend" && npm run dev"

:: 3. Abrir automáticamente en el navegador web
echo [3/3] Abriendo aplicacion en tu navegador...
timeout /t 3 /nobreak >nul
start http://localhost:5173

echo.
echo ========================================================
echo   Listo! Ambos servidores estan corriendo.
echo   La web se abrio en tu navegador: http://localhost:5173
echo ========================================================
pause
