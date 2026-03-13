@echo off
TITLE Instalador de Servicos - Sistema PDV
echo ======================================================
echo    CONFIGURANDO SERVICOS DO SISTEMA PDV NO PM2
echo ======================================================
echo.

:: Muda para o diretorio do sistema (C:\Sistema PDV ou onde o arquivo estiver)
cd /d "%~dp0"

echo [1/4] Limpando processos antigos...
pm2 delete pdv-api >nul 2>&1
pm2 delete pdv-frontend >nul 2>&1

echo.
echo [2/4] Iniciando Servidor de Dados (API)...
pm2 start server.cjs --name "pdv-api"

echo.
echo [3/4] Iniciando Interface do Usuario (Frontend)...
:: Usando npm.cmd que e o mais estavel para Windows
pm2 start "npm.cmd" --name "pdv-frontend" -- run dev

echo.
echo [4/4] Salvando configuracao para auto-inicio...
pm2 save

echo.
echo ======================================================
echo    CONFIGURACAO CONCLUIDA! STATUS ATUAL:
echo ======================================================
pm2 list
echo.
echo Agora voce pode acessar o sistema na rede pelo IP do servidor.
echo Exemplo: http://192.168.0.108:3000
echo.
pause
