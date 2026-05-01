@echo off
title BARBERFLOW - RESETAR WHATSAPP
color 0C
set BASE_DIR=%~dp0

echo =======================================================
echo          RESETAR WHATSAPP - BARBERFLOW
echo =======================================================
echo.
echo ATENCAO: Isso vai fechar o sistema e limpar a sessao do WhatsApp.
echo Voce precisara ler o QR Code novamente para conectar.
echo.
set /p confirm=Deseja continuar? (S/N): 
if /i "%confirm%" neq "S" exit

echo.
echo [1/3] Encerrando processos...
taskkill /F /IM node.exe /T >nul 2>&1
taskkill /F /IM chrome.exe /T >nul 2>&1

echo [2/3] Limpando cache e sessao...
cd /d "%BASE_DIR%backend"
if exist "auth_baileys" (
    echo Deletando pasta auth_baileys...
    rd /s /q "auth_baileys"
)
if exist "auth_baileys_pro" (
    echo Deletando pasta auth_baileys_pro...
    rd /s /q "auth_baileys_pro"
)
if exist "auth_info_baileys" (
    echo Deletando pasta auth_info_baileys...
    rd /s /q "auth_info_baileys"
)
if exist ".wwebjs_auth" rd /s /q ".wwebjs_auth"
if exist ".wwebjs_cache" rd /s /q ".wwebjs_cache"

echo [3/3] Reiniciando sistema...
timeout /t 2 >nul
cd /d "%BASE_DIR%"
start 1-INICIAR_SISTEMA.bat

echo.
echo =======================================================
echo SUCESSO! O sistema foi resetado e esta ligando.
echo AGUARDE O NOVO QR CODE APARECER NO TERMINAL.
echo =======================================================
timeout /t 5
exit
