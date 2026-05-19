@echo off
echo.
echo  ============================
echo  MASCOTE - iniciando app local
echo  ============================
echo.
cd /d "%~dp0"
if not exist node_modules (
    echo Instalando dependencias na primeira vez...
    call npm install
)
call npx expo start --web
