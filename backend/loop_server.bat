@echo off
title Servidor Interno - NAO FECHE!
color 0A
echo =======================================================
echo [SISTEMA ANTI-QUEDA ATIVADO]
echo Este servidor reiniciara automaticamente caso ocorra
echo algum erro no WhatsApp ou na conexao.
echo POR FAVOR, NAO FECHE ESTA JANELA!
echo =======================================================
echo.

:loop
node server.js
echo.
echo [AVISO] O servidor fechou ou encontrou um erro fatal!
echo [AVISO] O sistema Anti-Queda esta reiniciando o servidor em 3 segundos...
timeout /t 3 >nul
goto loop
