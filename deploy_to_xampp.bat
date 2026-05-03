@echo off
title BARBERFLOW - DEPLOY PARA XAMPP
color 0B

echo =======================================================
echo          PREPARANDO DEPLOY PARA XAMPP
echo =======================================================
echo.

:: Verifica se esta rodando como Administrador (necessario para escrever em C:\xampp)
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [AVISO] Este script pode precisar de permissao de ADMINISTRADOR.
    echo Se falhar, tente clicar com o botao direito e "Executar como Administrador".
)

:: 1. Build do Frontend
echo [1/3] Gerando arquivos do Frontend (Vite)...
cd frontend
call npm install
call npm run build
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao gerar o build do frontend.
    pause
    exit /b %errorlevel%
)

:: Cria o arquivo .htaccess para SPA
echo Options -MultiViews > dist\.htaccess
echo RewriteEngine On >> dist\.htaccess
echo RewriteBase /barberflow/ >> dist\.htaccess
echo RewriteRule ^index\.html$ - [L] >> dist\.htaccess
echo RewriteCond %%{REQUEST_FILENAME} !-f >> dist\.htaccess
echo RewriteCond %%{REQUEST_FILENAME} !-d >> dist\.htaccess
echo RewriteRule . /barberflow/index.html [L] >> dist\.htaccess

cd ..

:: 2. Criar pasta no XAMPP
echo [2/3] Copiando arquivos para C:\xampp\htdocs\barberflow...
if not exist "C:\xampp\htdocs" (
    echo [ERRO] Pasta C:\xampp\htdocs nao encontrada. O XAMPP esta instalado em outro local?
    echo Por favor, verifique se o caminho C:\xampp existe.
    pause
    exit /b 1
)

if not exist "C:\xampp\htdocs\barberflow" mkdir "C:\xampp\htdocs\barberflow"
xcopy /s /e /y "frontend\dist\*" "C:\xampp\htdocs\barberflow\"

:: 3. Setup do Banco (Aviso)
echo.
echo [3/3] Quase pronto!
echo.
echo O banco de dados MySQL sera criado automaticamente ao iniciar o backend.
echo Certifique-se de que o MySQL no Painel do XAMPP esta INICIADO (Start).
echo.
echo =======================================================
echo DEPLOY CONCLUIDO COM SUCESSO!
echo Aceda em: http://localhost/barberflow
echo =======================================================
echo.
pause
