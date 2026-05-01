@echo off
title BARBERFLOW - ATUALIZAR SISTEMA
color 0E
set BASE_DIR=%~dp0

echo =======================================================
echo          ATUALIZACAO DO SISTEMA BARBERFLOW
echo =======================================================
echo.

echo [1/3] Atualizando dependencias do Backend...
cd /d "%BASE_DIR%backend"
call npm install

echo.
echo [2/3] Atualizando dependencias do Frontend...
cd /d "%BASE_DIR%frontend"
call npm install

echo.
echo [3/3] Reconstruindo a interface visual...
call npm run build

echo.
echo =======================================================
echo SISTEMA ATUALIZADO COM SUCESSO!
echo Agora voce pode usar o '1-INICIAR_SISTEMA.bat'.
echo =======================================================
pause
