@echo off
REM ======================================================================
REM  Peonies Boutique - Digital Catalog launcher (Windows)
REM  Opens the catalog full screen in Microsoft Edge (or Google Chrome),
REM  using a private browser profile stored in the "browser-data" folder
REM  next to this file. Your catalog content is saved in that profile.
REM  To close the catalog: press Alt+F4 (with a keyboard).
REM ======================================================================
setlocal
set "HERE=%~dp0"
set "APPFILE=%HERE%index.html"
set "URL=file:///%APPFILE:\=/%"
set "PROFILE=%HERE%browser-data"

set "BROWSER="
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "BROWSER=%LocalAppData%\Google\Chrome\Application\chrome.exe"

if not defined BROWSER (
  echo Microsoft Edge or Google Chrome was not found on this computer.
  echo Please install one of them, or open index.html manually.
  pause
  exit /b 1
)

start "" "%BROWSER%" --user-data-dir="%PROFILE%" "--app=%URL%" --start-fullscreen --no-first-run --no-default-browser-check --disable-pinch --overscroll-history-navigation=0 --autoplay-policy=no-user-gesture-required --disable-session-crashed-bubble --disable-features=TranslateUI,msEdgeTranslate --disable-translate
endlocal
