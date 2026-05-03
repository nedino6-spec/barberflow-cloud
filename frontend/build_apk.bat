@echo off
echo ===========================================
echo INICIANDO COMPILACAO DO APK BARBERFLOW
echo ===========================================

echo.
echo [0/4] Limpando versoes antigas...
if exist "android\app\build\outputs\apk\debug\app-debug.apk" (
    del /f /q "android\app\build\outputs\apk\debug\app-debug.apk"
    echo ✅ APK antigo removido.
) else (
    echo ℹ️ Nenhum APK antigo encontrado.
)

:: Set Android and Java Paths
set ANDROID_HOME=C:\Users\nedin\AppData\Local\Android\Sdk
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
set PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\cmdline-tools\latest\bin;%ANDROID_HOME%\platform-tools;%PATH%

echo.
echo [1/4] Instalando dependencias do projeto (React, Capacitor)...
call npm install

echo [EXTRA] Mantendo configuracoes de URL Publica...
echo ✅ Configuracao preservada!

echo.
echo [2/4] Compilando a Web (React/Vite)...
call npm run build

echo.
echo [3/4] Sincronizando com Capacitor...
call npx cap sync android

echo.
echo [4/4] Compilando APK via Gradle...
cd android
call gradlew assembleDebug
cd ..

echo [5/5] Disponibilizando para download no servidor...
set SERVER_PUBLIC=..\..\servidor\public
if exist "android\app\build\outputs\apk\debug\app-debug.apk" (
    copy /y "android\app\build\outputs\apk\debug\app-debug.apk" "%SERVER_PUBLIC%\barberflow.apk"
    echo ✅ APK copiado para o servidor!
    echo 🔗 Link para download: https://moisten-illusion-city.ngrok-free.dev/barberflow.apk
)

echo.
echo ===========================================
echo PROCESSO FINALIZADO COM SUCESSO!
echo O APK ESTA DISPONIVEL PARA DOWNLOAD EM:
echo https://moisten-illusion-city.ngrok-free.dev/barberflow.apk
echo ===========================================
pause
