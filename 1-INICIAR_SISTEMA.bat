@echo off
title BARBERFLOW - INICIAR SISTEMA
color 0A
set BASE_DIR=%~dp0

echo =======================================================
echo          BARBERFLOW - GESTAO INTELIGENTE
echo =======================================================
echo.
echo [1/3] Limpando processos antigos...
taskkill /F /IM node.exe /T >nul 2>&1
taskkill /F /IM chrome.exe /T >nul 2>&1
timeout /t 2 >nul

echo [2/3] Verificando integridade...
if not exist "%BASE_DIR%backend\node_modules" (
    echo [!] Pasta node_modules nao encontrada. 
    echo [!] Executando atualizacao automatica...
    call "4-ATUALIZAR_SISTEMA.bat"
)

echo [3/3] Iniciando o Servidor (Com Anti-Queda)...
cd /d "%BASE_DIR%backend"
start "BarberFlow Server" cmd /c "loop_server.bat"

echo.
echo Aguarde o painel abrir (8 segundos)...
timeout /t 8 >nul
start http://localhost:3001

echo.
echo =======================================================
echo SISTEMA LIGADO! Mantenha esta janela aberta.
echo =======================================================
pause
