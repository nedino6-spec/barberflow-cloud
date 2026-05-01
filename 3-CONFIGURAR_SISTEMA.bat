@echo off
title BARBERFLOW - CONFIGURAR SISTEMA
color 0B
set BASE_DIR=%~dp0

echo =======================================================
echo          CONFIGURACAO DO SISTEMA BARBERFLOW
echo =======================================================
echo.

:: Verifica se esta rodando como Administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERRO] Este script precisa ser executado como ADMINISTRADOR.
    echo Por favor, clique com o botao direito e selecione "Executar como Administrador".
    pause
    exit
)

echo [1/2] Liberando portas no Firewall (3001 e 5173)...
netsh advfirewall firewall delete rule name="BarberFlow Backend Port 3001" >nul 2>&1
netsh advfirewall firewall delete rule name="BarberFlow Frontend Port 5173" >nul 2>&1
netsh advfirewall firewall delete rule name="BarberFlow Mobile" >nul 2>&1
netsh advfirewall firewall add rule name="BarberFlow Backend Port 3001" dir=in action=allow protocol=TCP localport=3001
netsh advfirewall firewall add rule name="BarberFlow Frontend Port 5173" dir=in action=allow protocol=TCP localport=5173

echo.
echo [2/2] Configurando inicializacao automatica...
:: Adiciona o script de iniciar ao registro do Windows para iniciar com o sistema
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "BarberFlow" /t REG_SZ /d "\"%BASE_DIR%1-INICIAR_SISTEMA.bat\"" /f

echo.
echo =======================================================
echo CONFIGURACAO CONCLUIDA COM SUCESSO!
echo O sistema agora esta liberado para acesso via celular e
echo iniciara automaticamente com o Windows.
echo =======================================================
pause
