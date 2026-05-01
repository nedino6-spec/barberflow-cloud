@echo off
echo ===========================================
echo INICIANDO COMPILACAO DO APK BARBERFLOW
echo ===========================================

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

echo.
echo ===========================================
echo PROCESSO FINALIZADO COM SUCESSO!
echo O APK ESTA DISPONIVEL EM:
echo frontend\android\app\build\outputs\apk\debug\app-debug.apk
echo ===========================================
pause
