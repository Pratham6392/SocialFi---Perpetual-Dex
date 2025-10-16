@echo off
echo.
echo ========================================
echo  COMPILING ENGLISH TRANSLATIONS
echo ========================================
echo.
echo This will compile all the German to English replacements...
echo.
pause

cd /d "%~dp0"

echo.
echo Compiling translations...
call npx @lingui/cli compile

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo  SUCCESS! Translations Compiled!
    echo ========================================
    echo.
    echo Now open your browser and:
    echo 1. Press F12 to open Developer Console
    echo 2. Run: localStorage.clear()
    echo 3. Refresh the page
    echo.
    echo Then start the app with: npm start
    echo.
) else (
    echo.
    echo ========================================
    echo  ERROR! Compilation Failed
    echo ========================================
    echo.
)

pause

