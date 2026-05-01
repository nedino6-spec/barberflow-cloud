@echo off
set ANDROID_HOME=C:\Users\nedin\AppData\Local\Android\Sdk
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
set PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\cmdline-tools\latest\bin;%ANDROID_HOME%\platform-tools;%PATH%

cd android
cmd /c "gradlew assembleDebug"
