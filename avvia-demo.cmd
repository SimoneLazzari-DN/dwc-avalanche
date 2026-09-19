@echo off
rem Riaccende la demo DWC dopo un riavvio del PC: app, tunnel e indirizzo fisso.
rem Doppio clic su questo file. Si aprono tre finestre nere: NON chiuderle finche' serve la demo.
cd /d "%~dp0web"
start "DWC - app" cmd /k "npx next start -p 3100"
cd /d "%~dp0.tools"
start "DWC - tunnel" cmd /k "node tunnel.js"
timeout /t 20 /nobreak >nul
start "DWC - indirizzo fisso" cmd /k "node publish-url.js"
echo.
echo Fatto. Tra circa 2 minuti l'app e' di nuovo raggiungibile da:
echo   https://simonelazzari-dn.github.io/dwc-avalanche/
echo Dal tuo PC funziona subito anche: http://localhost:3100
echo.
pause
