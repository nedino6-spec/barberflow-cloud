@echo off
title ENVIAR PARA NUVEM - BARBERFLOW
cls
echo ======================================================
echo           BARBERFLOW - PREPARAR PARA NUVEM
echo ======================================================
echo.
echo Este script vai preparar seus arquivos para o GitHub.
echo.
echo 1. Certifique-se de ter uma conta em: https://github.com
echo 2. Crie um novo repositorio chamado "barberflow-cloud"
echo.
echo Pressione qualquer tecla para começar a preparar os arquivos...
pause > nul

cls
echo [1/4] Limpando arquivos temporarios...
rmdir /s /q frontend\dist 2>nul
rmdir /s /q backend\node_modules 2>nul
rmdir /s /q frontend\node_modules 2>nul

echo [2/4] Gerando nova versao do painel (Build)...
cd frontend
call npm install && call npm run build
cd ..

cls
echo [3/4] Inicializando Repositorio...
git init
git add .
git commit -m "Deploy BarberFlow Cloud"

cls
echo ======================================================
echo           QUASE PRONTO! ULTIMOS PASSOS:
echo ======================================================
echo.
echo Agora, copie e cole os comandos abaixo que o GitHub te deu:
echo (Eles aparecem na pagina do seu repositorio novo)
echo.
echo git remote add origin https://github.com/SEU_USUARIO/barberflow-cloud.git
echo git branch -M main
echo git push -u origin main
echo.
echo ======================================================
echo Depois de subir, me avise para eu te ajudar no Railway!
echo ======================================================
pause
